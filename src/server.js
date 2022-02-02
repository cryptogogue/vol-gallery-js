

import { VOLGalleryREST }           from './VOLGalleryREST';
import bodyParser                   from 'body-parser';
import express                      from 'express';

//----------------------------------------------------------------//
export async function makeServer ( db ) {

    const server = express ();

    server.use ( function ( req, res, next ) {
        res.header ( 'Access-Control-Allow-Origin', '*' );
        res.header ( 'Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-Auth-Token, Authorization, Content-Type, Accept' );
        res.header ( 'Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, PATCH, OPTIONS' );
        next ();
    });

    server.use ( bodyParser.json ());
    server.use ( bodyParser.urlencoded ({ extended: true }));

    let router = express.Router ();

    router.use ( new VOLGalleryREST ().router );

    router.get ( '/', ( request, result ) => {
        const message = {
            type: 'VOL_GALLERY',
        };
        result.json ( message );
    });

    server.use ( '/', router );

    return server;
}
