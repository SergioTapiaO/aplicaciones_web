"use strict"

class DAORespuestas{

    constructor(pool){
        this.pool = pool;
    }

    insertRespuesta(idP, correo, cuerpo, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "INSERT INTO respuesta (idPregunta, correoUsuario, cuerpo) VALUES (?, ?, ?)"
                connection.query(sql, [idP, correo, cuerpo], 
                    function(err, resultado) {
                        connection.release();
                        if (err) {
                            callback(new Error("Error al ejecutar query: " + err.message));
                        } else {
                            callback(null, resultado.insertId);
                        }
                    });
            }
        })
    }

    respuestasByPregunta(id, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "SELECT * FROM respuesta WHERE idPregunta = ?";
                connection.query(sql, [id], 
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

    votoPositivo(id, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "UPDATE respuesta SET votos_positivos = votos_positivos + 1 WHERE id = ?";
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
                const sql = "UPDATE respuesta SET votos_negativos = votos_negativos + 1 WHERE id = ?";
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
                const sql = 'SELECT votos_positivos, votos_negativos FROM respuesta WHERE correoUsuario = ?'
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

}//clase

module.exports = DAORespuestas;