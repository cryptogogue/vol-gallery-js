
import * as cardmotron              from 'cardmotron';
import * as config                  from 'config';
import convertSVG                   from 'convert-svg-to-png';
import express                      from 'express';
import * as fgc                     from 'fgc';
import _                            from 'lodash';
import * as vol                     from 'vol';

//================================================================//
// VOLGalleryREST
//================================================================//
export class VOLGalleryREST {

    //----------------------------------------------------------------//
    constructor ( volQueryDB, ) {
        
        this.consensusService   = new vol.ConsensusService ();
        this.svgConverter       = convertSVG.createConverter ();
        this.revocable          = new fgc.RevocableContext ();
        this.router             = express.Router ();

        this.router.get         ( '/owner/:ownerID/assets/:assetID/asset.png',               this.getAssetAsync.bind ( this ));

        this.startServiceLoopAsync ();
    }

    //----------------------------------------------------------------//
    async fetchAssetSVGAsync ( assetID, ownerID, dpi ) {

        if ( !this.schema ) return false;
        const result = await this.revocable.fetchJSON ( this.consensusService.getServiceURL ( `/assets/${ assetID }` ));
        const asset = result.asset;

        const svgBody       = this.schema.renderAssetSVG ( asset );
        const metrics       = this.schema.getAssetDocSize ( asset );
        fgc.assert ( svgBody && metrics );

        dpi                 = dpi || metrics.dpi;
        const dpiScale      = dpi / metrics.dpi;

        const assetWidth    = metrics.width * dpiScale;
        const assetHeight   = metrics.height * dpiScale;

        const docWidthInInches      = ( metrics.width ) / metrics.dpi;
        const docHeightInInches     = ( metrics.height ) / metrics.dpi;
        
        if (ownerID == asset.owner) {
            return (
                `<svg
                    width   = "${ docWidthInInches * dpi }"
                    height  = "${ docHeightInInches * dpi }"
                    viewBox = "0 0 ${ docWidthInInches * dpi } ${ docHeightInInches * dpi }"
                    preserveAspectRatio = 'xMidYMid meet'
                >
                    <g transform = "scale ( ${ dpiScale } ${ dpiScale })">
                        ${ svgBody }
                    </g>
                </svg>`
            );
        }

        return (
            `<svg
                width   = "${ docWidthInInches * dpi }"
                height  = "${ docHeightInInches * dpi }"
                viewBox = "0 0 ${ docWidthInInches * dpi } ${ docHeightInInches * dpi }"
                preserveAspectRatio = 'xMidYMid meet'
            >
                <g transform = "scale ( ${ dpiScale } ${ dpiScale })">
                    
                <g>
                <svg id="diagtext" xmlns="http://www.w3.org/2000/svg" 
                xmlns:xlink="http://www.w3.org/1999/xlink" 
                width="100%" height="100%">
                <style type="text/css">text { fill: gray; font-family: Avenir, Arial, Helvetica, sans-serif; }
                </style>
                <defs>
                <pattern id="owner" patternUnits="userSpaceOnUse" width="400" height="200"><text y="30" font-size="40" id="name"> ${asset.owner}</text></pattern>
                <pattern xlink:href="#owner"><text y="120" x="200" font-size="30" id="occupation">asset owner</text></pattern><pattern id="combo" xlink:href="#owner" patternTransform="rotate(-45)"><use xlink:href="#name" /><use xlink:href="#occupation" />
                </pattern></defs><rect width="100%" height="100%" fill="url(#combo)" >
                </rect></svg>
                </g>
                </g>
            </svg>`
        );
    }

    //----------------------------------------------------------------//
    async getAssetAsync ( request, response ) {

        try {

            const query     = request.query || {};
            const fmt       = query.fmt || 'png';
            const scale     = query.scale ? parseFloat ( query.scale ) : 1.0;
            const dpi       = query.dpi ? parseInt ( query.dpi ) : 300;

            const svg = await this.fetchAssetSVGAsync ( request.params.assetID,  request.params.ownerID, dpi );

            if ( svg ) {

                switch ( fmt ) {

                    case 'svg': {
                        response.set ( 'Content-Type', 'image/svg+xml' );
                        response.send ( svg );
                        return;
                    }

                    case 'png': {
                        const png = await this.svgConverter.convert ( svg, { background: '#ffffff', scale: scale });
                        response.set ( 'Content-Type', 'image/png' );
                        response.send ( png );
                        return;
                    }
                }
            }
        }
        catch ( error ) {
            console.log ( error );
        }
        fgc.rest.handleError ( response, 400 );
    }

    //----------------------------------------------------------------//
    async serviceLoopAsync () {

        try {

            let schemaHash = false;
            if ( this.schemaHash ) {
                const result = await this.revocable.fetchJSON ( this.consensusService.getServiceURL ( `/` ));
                schemaHash = result.schemaHash;
            }

            if ( !this.schemaHash || ( this.schemaHash !== schemaHash )) {

                console.log ( 'FETCHING SCHEMA' );
                const schemaInfo = await this.revocable.fetchJSON ( this.consensusService.getServiceURL ( `/schema` ));

                console.log ( 'AFFIRMING FONTS' );
                const schema = new cardmotron.Schema ( schemaInfo.schema );
                await schema.affirmFontsAsync ();

                console.log ( 'GOT SCHEMA' );
                this.schema = schema;
                this.schemaHash = schemaInfo.schemaHash;
            }
        }
        catch ( error ) {
            console.log ( error );
        }

        this.revocable.timeout (() => { this.serviceLoopAsync ()}, 300000 );
    }

    //----------------------------------------------------------------//
    async startServiceLoopAsync () {

        console.log ( 'INITIALIZING CONSENSUS SERVICE' );
        await this.consensusService.initializeWithNodeURLAsync ( config.VOL_PRIMARY_URL );
        console.log ( 'STARTING CONSENSUS SERVICE LOOP' );
        await this.consensusService.startServiceLoopAsync ();
        console.log ( 'STARTED CONSENSUS AT HEIGHT:', this.consensusService.height );

        this.serviceLoopAsync ();
    }
}
