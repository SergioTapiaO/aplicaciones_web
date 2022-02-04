"use strict"

class DAOUsers{

    constructor(pool){
        this.pool = pool;
    }

    exist(user, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "SELECT * FROM usuario WHERE correo = ?";
                connection.query(sql, [user], 
                    function(err, row){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                           if(row.length === 0){
                                callback(null, false); //no está el usuario con el password proporcionado
                            }
                            else{
                                let json = JSON.parse(JSON.stringify(row));
                                let iden = json[0];
                                callback(null, iden);
                            }
                        }
                    })
            }
        })
    }

    getImage(user, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "SELECT imagen FROM usuario WHERE correo = ?";
                connection.query(sql, [user], 
                    function(err, row){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                           if(row.length === 0){
                                callback(null, false); //no está el usuario con el password proporcionado
                            }
                            else{
                                callback(null, row[0].imagen);
                            }
                        }
                    })
            }
        })
    }

    newUser(correo, nombre, clave, img, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }else{
                const sql = "INSERT INTO usuario (nombre, correo, clave, imagen) VALUES (?, ?, ?, ?)";
                connection.query(sql, [nombre, correo, clave, img], 
                    function(err, insertado){
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

    randomNumber(){
        let img;
        let numero =  Math.floor(Math.random()*(2+1));
        while(numero > 2 || numero < 0){ // por si acaso no sale el numero que queremos
            numero =  Math.floor(Math.random()*(2+1));
        }
        return numero + 1;
    }

    userInfoPreguntas(correo, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "SELECT SUM(votos_pos) as positivos, SUM(votos_neg) as negativos, SUM(visitas) as visitas, COUNT(*) as n_preguntas FROM pregunta WHERE correo_usuario = ?";
                connection.query(sql, [correo], 
                    function(err, row){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            let json = JSON.parse(JSON.stringify(row));
                            let iden = json[0];
                            // hay que comprobar si hay alguna para este usuario 
                            // y en caso contrario devolver 0
                            if(iden.positivos == null){
                                iden.positivos = 0;
                            }
                            if(iden.negativos == null){
                                iden.negativos = 0;
                            }
                            callback(null, iden);
                        }
                    })
            }
        })
    }

    userInfoRespuestas(correo, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "SELECT SUM(votos_positivos) as positivos, SUM(votos_negativos) as negativos, COUNT(*) as n_respuestas FROM respuesta WHERE correoUsuario = ?";
                connection.query(sql, [correo], 
                    function(err, row){
                        connection.release();
                        if(err){
                            callback(new Error("Error al acceso a la base de datos"));
                            console.log(err.stack);
                        }
                        else{
                            let json = JSON.parse(JSON.stringify(row));
                            let iden = json[0];
                            // hay que comprobar si hay alguna para este usuario 
                            // y en caso contrario devolver 0
                            /*if(iden.positivos == null){
                                iden.positivos = 0;
                            }
                            if(iden.negativos == null){
                                iden.negativos = 0;
                            }*/
                            callback(null, iden);
                        }
                    })
            }
        })
    }

    aumentarContadorPreguntas(user, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "UPDATE usuario SET num_preg_form = num_preg_form + 1 WHERE correo = ?";
                connection.query(sql, [user], 
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

    aumentarContadorRespuestas(user, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "UPDATE usuario SET num_resp_pub = num_resp_pub + 1 WHERE correo = ?";
                connection.query(sql, [user], 
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

    actualizarReputacion(reputacion, user, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = "UPDATE usuario SET reputacion = ? WHERE correo = ?";
                connection.query(sql, [reputacion, user], 
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

    gestionarMedallasPreguntas(info_preguntas){
        // medallas para las preguntas
        let medalla_preguntas = {
            estudiante : 0,
            interesante: 0,
            buena: 0, 
            excelente: 0,
            total_positivos : 0,
            total_negativos :0
        }
        info_preguntas.forEach(pregunta=>{
            medalla_preguntas.total_positivos += pregunta.votos_pos;
            medalla_preguntas.total_negativos += pregunta.votos_neg;
            let pts = pregunta.votos_pos - pregunta.votos_neg;
            if(pts === 1){
                medalla_preguntas.estudiante++;
            }
            else if(pts === 2){
                medalla_preguntas.interesante++;
            }
            else if(pts >= 4 && pts < 6){
                medalla_preguntas.buena++;
            }
            else if(pts >= 6){
                medalla_preguntas.excelente++;
            }
        })

        return medalla_preguntas;
    }

    gestionarMedallasRespuestas(info_respuestas){
        // medallas para las preguntas
        let medallas = {
            interesante: 0,
            buena: 0, 
            excelente: 0,
            total_positivos: 0,
            total_negativos: 0
        }
        info_respuestas.forEach(res=>{
            medallas.total_positivos += res.votos_positivos;
            medallas.total_negativos += res.votos_negativos;
            let pts = res.votos_positivos - res.votos_negativos;
            if(pts >= 2 && pts < 4){
                medallas.interesante++;
            }
            else if(pts >= 4 && pts < 6){
                medallas.buena++;
            }
            else if(pts >= 6){
                medallas.excelente++;
            }
        })

        return medallas;
    }

    gestionarMedallasVisitas(info){
        let medallas ={
            popular: 0,
            destacada: 0,
            famosa: 0
        }

        info.forEach(pregunta =>{
            if(pregunta.visitas >= 2 && pregunta.visitas < 4){
                medallas.popular++;
            }
            else if(pregunta.visitas >= 4 && pregunta.visitas < 6){
                medallas.destacada++;
            }
            else if(pregunta.visitas >= 6){
                medallas.famosa++;
            }
        })

        return medallas;
    }

    // devuelve todos los usuarios de la BBDD
    readAll(callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = 'SELECT correo, nombre, reputacion FROM usuario'
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

    readByName(name, callback){
        this.pool.getConnection((err, connection)=>{
            if(err){
                callback(new Error("Error de conexion a la base de datos"));
            }
            else{
                const sql = 'SELECT nombre, correo, reputacion FROM usuario WHERE nombre LIKE ?'
                connection.query(sql, ['%'+name+'%'], 
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

module.exports = DAOUsers;