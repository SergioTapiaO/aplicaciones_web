"use strict"

const { response } = require("express");

class DAOPreguntas{

    constructor(pool){
        this.pool = pool;
    }

    // Devuelve todas las preguntas almacenadas en la base de datos en la funciÃ³n callback.
    readAll(callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = 'SELECT pregunta.id, pregunta.titulo, pregunta.correo_usuario,  pregunta.cuerpo, GROUP_CONCAT(etiqueta.nombre) as tags FROM pregunta LEFT JOIN preguntaEtiqueta ON pregunta.id = preguntaEtiqueta.id_pregunta LEFT JOIN etiqueta ON preguntaEtiqueta.id_etiqueta = etiqueta.id GROUP BY pregunta.id'
                connection.query(sql, 
                    function(err, rows){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            let json = JSON.parse(JSON.stringify(rows));
                            callback(null, json);
                        }
                    })
            }
        })
    }

    // Dada una pregunta con valores vÃ¡lidos, la inserta en la base de datos y devuelve el id en la funciÃ³n callback.
    create(pregunta, callback) {
        this.pool.getConnection(function(err, connection) {
            if (err) {
                console.log("Error de conexiÃ³n a la BD.")
            } else {
                const query = "INSERT INTO pregunta (correo_usuario, titulo, cuerpo) VALUES (?, ?, ?)";
                connection.query(query, [pregunta.user, pregunta.titulo, pregunta.cuerpo],
                    function(err, resultado) {
                        connection.release();
                        if (err) {
                            callback(new Error("Error al ejecutar query: " + err.message));
                        } else {
                            callback(null, resultado.insertId);
                        }
                    });
            }
        });
    }

    // Dado un nombre de etiqueta, devuelve en la funciÃ³n callback todas las preguntas que contengan la etiqueta
    // seleccionada.
    readByEtiqueta(nombre_etiqueta, callback) {
        this.pool.getConnection(function(err, connection) {
            if (err) {
                console.log("Error de conexiÃ³n a la BD.")
            } else {
                const query = 'SELECT pregunta.id, pregunta.titulo, pregunta.correo_usuario,  pregunta.cuerpo, GROUP_CONCAT(etiqueta.nombre) as tags FROM pregunta  JOIN preguntaEtiqueta ON pregunta.id = preguntaEtiqueta.id_pregunta JOIN etiqueta ON preguntaEtiqueta.id_etiqueta = etiqueta.id WHERE pregunta.id IN'
                 + '(SELECT pregunta.id FROM pregunta INNER JOIN preguntaEtiqueta ON pregunta.id = preguntaEtiqueta.id_pregunta INNER JOIN etiqueta ON preguntaEtiqueta.id_etiqueta = etiqueta.id WHERE etiqueta.nombre = ?) '+
                 'GROUP BY pregunta.id';
                connection.query(query, [nombre_etiqueta],
                     function(err, rows) {
                    if (err) {
                        callback(new Error("Error al ejecutar query: " + err.message));
                    } else {
                        let json = JSON.parse(JSON.stringify(rows));
                        callback(null, json);
                    }
                });
            }
        });
    }

    // Dados un id de pregunta y un voto (positivo o negativo), modifica la pregunta con el voto seleccionado
    // y devuelve su id en la funciÃ³n callback.
    votoPositivo(id, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "UPDATE pregunta SET votos_pos = votos_pos + 1 WHERE id = ?";
                connection.query(sql, [id], 
                    function(err){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            callback(null);
                        }
                    })
            }
        })
    }

    votoNegativo(id, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "UPDATE pregunta SET votos_neg = votos_neg + 1 WHERE id = ?";
                connection.query(sql, [id], 
                    function(err){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            callback(null);
                        }
                    })
            }
        })
    }

    // Dado un id de una pregunta, devuelve la pregunta seleccionada (si existe) en la funciÃ³n callback. 
    read(id, callback) {
        this.pool.getConnection(function(err, connection) {
            if (err) {
                console.log("Error de conexiÃ³n a la BD.")
            } else {
                const query = 'SELECT pregunta.id, pregunta.titulo, pregunta.correo_usuario,  pregunta.cuerpo, pregunta.fecha_pub, pregunta.votos_pos, pregunta.votos_neg, pregunta.visitas, GROUP_CONCAT(etiqueta.nombre) as tags FROM pregunta LEFT JOIN preguntaEtiqueta ON pregunta.id = preguntaEtiqueta.id_pregunta LEFT JOIN etiqueta ON preguntaEtiqueta.id_etiqueta = etiqueta.id WHERE pregunta.id = ? GROUP BY pregunta.id'
                connection.query(query, [id], function(err, rows) {
                    if (err) {
                        callback(new Error("Error al ejecutar query: " + err.message));
                    } else {
                        let json = JSON.parse(JSON.stringify(rows));
                        callback(null, json[0]);
                    }
                });
            }
        });
    }

    // Dado un texto, devuelve en la funciÃ³n callback todas las preguntas que contengan ese texto.
    readByTexto(cuerpo, callback) { ///// A COMPLETAR
        this.pool.getConnection(function(err, connection) {
            if (err) {
                console.log("Error de conexiÃ³n a la BD.")
            } else {
                const sql = 'SELECT pregunta.id, pregunta.titulo, pregunta.correo_usuario, pregunta.cuerpo, GROUP_CONCAT(etiqueta.nombre) as tags FROM pregunta LEFT JOIN preguntaEtiqueta ON pregunta.id = preguntaEtiqueta.id_pregunta LEFT JOIN etiqueta ON preguntaEtiqueta.id_etiqueta = etiqueta.id WHERE pregunta.id IN'
                +'(SELECT pregunta.id FROM pregunta WHERE cuerpo LIKE ? OR titulo LIKE ?)'
                +'GROUP BY pregunta.id';
                connection.query(sql,['%'+cuerpo+'%', '%'+cuerpo+'%'] ,
                    function(err, rows){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            let json = JSON.parse(JSON.stringify(rows));
                            callback(null, json);
                        }
                    })
            }
        });
    }

    // Dado un booleano, devuelve todas las preguntas en la funciÃ³n callback que hayan sido respondidas o no 
    // en funciÃ³n del booleano.
    readByRespondida(callback) {
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = 'SELECT pregunta.id, pregunta.titulo, pregunta.correo_usuario,  pregunta.cuerpo, GROUP_CONCAT(etiqueta.nombre) as tags FROM pregunta LEFT JOIN preguntaEtiqueta ON pregunta.id = preguntaEtiqueta.id_pregunta LEFT JOIN etiqueta ON preguntaEtiqueta.id_etiqueta = etiqueta.id WHERE pregunta.respondida = ? GROUP BY pregunta.id'
                connection.query(sql, [0],
                    function(err, rows){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            let json = JSON.parse(JSON.stringify(rows));
                            callback(null, json);
                        }
                    })
            }
        })
    }

    visitarPregunta(id, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "UPDATE pregunta SET visitas = visitas + 1 WHERE id = ?";
                connection.query(sql, [id], 
                    function(err){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            callback(null);
                        }
                    })
            }
        })
    }

    readByUser(user, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = 'SELECT votos_pos, votos_neg, visitas FROM pregunta WHERE correo_usuario = ?'
                connection.query(sql, [user],
                    function(err, rows){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            let json = JSON.parse(JSON.stringify(rows));
                            callback(null, json);
                        }
                    })
            }
        })
    }

    marcarRespondida(id, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "UPDATE pregunta SET respondida = 1 WHERE id = ?";
                connection.query(sql, [id], 
                    function(err){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            callback(null);
                        }
                    })
            }
        })
    }

}//clase

module.exports = DAOPreguntas;