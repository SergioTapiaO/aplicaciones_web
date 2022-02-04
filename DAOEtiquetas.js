"use strict"

class DAOEtiquetas{

    constructor(pool){
        this.pool = pool;
    }

    exists(tag, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }else{
                const sql = "SELECT id FROM etiqueta WHERE nombre = ?";
                connection.query(sql, [tag], 
                    function(err, tag){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            if(tag.length === 0){
                                callback(null, false);
                            }
                            else{
                                callback(null, tag[0].id);
                            }
                        }
                    })
            }
        })   
    }

    insertIntermedia(id_pregunta, id_etiqueta, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }else{
                const sql = "INSERT INTO preguntaEtiqueta (id_pregunta, id_etiqueta) VALUES (?, ?)";
                connection.query(sql, [id_pregunta, id_etiqueta], 
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

    insertTag(nombre, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }else{
                const sql = "INSERT INTO etiqueta (nombre) VALUES (?)";
                connection.query(sql, [nombre], 
                    function(err, insertado){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                        }
                        else{
                            callback(null, insertado.insertId);
                        }
                    })
            }
        })
    }

    separarPorArrobas(etiquetas){
        let sol = new Array();
        etiquetas = etiquetas.split('@');

        etiquetas.forEach(tag => {
            if(tag !== ''){
                sol.push(tag);
            }
        });

        return sol;
    }

    separarPorComas(preguntas){
        preguntas.forEach(pregunta =>{
            let sol = new Array();

            if(pregunta.tags === null){
                pregunta.tags = [];
            }
            else{
                pregunta.tags = pregunta.tags.split(',');
                pregunta.tags.forEach(tag =>{
                    if(tag !== ''){
                        sol.push(tag);
                    }
                })
            }
        })
        return preguntas;
    }

    separar_etiquetas(pregunta){
        let sol = new Array();

        if(pregunta.tags === null){
            pregunta.tags = [];
        }
        else{
            pregunta.tags = pregunta.tags.split(',');
            pregunta.tags.forEach(tag =>{
                if(tag !== ''){
                    sol.push(tag);
                }
            })
        }
        return pregunta;
    }

}//clase

module.exports = DAOEtiquetas;