"use strict"
//todos los requires
const mysql = require("mysql");
const config = require("./config")
const http = require("http");
const url = require("url");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const expressValidator = require("express-validator");
const session = require("express-session");
const mysqlSession = require("express-mysql-session");
// requires para los daos
const DAOUsers = require("./DAOUsers");
const DAOPreguntas = require("./DAOPreguntas");
const DAOEtiquetas = require("./DAOEtiquetas");
const DAORespuestas = require("./DAORespuestas");
const fs = require('fs');

//informacion relativa a la sesion
const MySQLStore = mysqlSession(session);
const sessionStore = new MySQLStore({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database
})


const { check, validationResult } = require("express-validator");
const { toNamespacedPath } = require("path");

// Crear el pool de conexiones
const pool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database
});

const app = express();

//el middleware de la sesion
const middlewareSession = session({
    saveUninitialized: false,
    secret: "footbar34",
    resave: false,
    store: sessionStore
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//para guardar la ruta de public
const ficherosEstaticos = path.join(__dirname, "public");
//para guardar la ruta de images
const imagenesUsuario = path.join(__dirname, "images");
const multerFactory = multer({ storage: multer.memoryStorage() });

// VALIDADORES
//validador personalizado que se encarga de mirar que no haya 
// espacios en blanco entre las etiquetas
const espaciosVacio = (param)=>{
    if(param.indexOf(' ') === -1){
        return true;
    }
    else return false;
}

//verifica que los tags empiezan por arroba, y tambien
// comprueba que el campo pueda estar vacio
const empiezaPorArroba = (param)=>{
    if(param === ''){
        return true;
    }
    else if(param.indexOf('@') === 0){
        return true;
    }
    else return false;
}

//verifica el numero maximo de etiquetas por pregunta
const maximo_etiquetas = (param)=>{
    let sol = new Array();
    sol = param.split('@');
    
    // si cuenta mas de 6 se pasa el limite
    //son 6 y no 5 porque cuenta el primer
    //hueco entre el principio y el primer @
    if(sol.length > 6) return false;
    else return true;
}

// MIDDLEWARES
app.use(express.static(ficherosEstaticos));
app.use(express.static(imagenesUsuario));
app.use(bodyParser.urlencoded({extended: false}));
//app.use(expressValidator());
app.use(middlewareSession);

function identificacionRequerida(request, response, next){
    if(request.session.currentEmail === undefined){
        response.status(200);
        response.render("login", {errores: false});
        //response.end();
    }
    else{
        response.status(200);
        next();
    }
}

function actualizarReputacion(reputacion, user,  request, response, next){
    daoUser.actualizarReputacion(reputacion, user, (err)=>{
        if(err){
            console.log(err.message);
            response.end();
        }
    })
}

//inicializacion de los DAOs
let daoUser = new DAOUsers(pool);
let daoPreguntas = new DAOPreguntas(pool);
let daoEtiquetas = new DAOEtiquetas(pool);
let daoRespuestas = new DAORespuestas(pool);

app.get("/", function(request, response){
    response.status(200);
    //response.type("text/plain; charset=utf-8");
    response.redirect("/login.html");
});

app.get("/login.html", function(request, response){
    response.status(200);
    response.render("login", {errores: false});
});

app.post("/login", 
    //comprobar que el correo no sea vacio
    check("usuario", "el campo correo esta vacio").notEmpty(), 
    // comprobar que es un email
    check("usuario", "direccion de correo no valida").isEmail(),
    // que la contraseña no este vacia
    check("clave", "contraseña vacia").notEmpty(),
    // AÑADIR mas en un futuro
    function(request, response){
        const errors = validationResult(request);
        let correo = request.body.usuario;
        let password = request.body.clave;

        if(errors.isEmpty()){
            daoUser.exist(correo, (err, sol) =>{
                if(err){
                    console.log(err.message);
                    response.end();
                }
                else if(!sol){
                    console.log("no existe ese usuario");
                    response.render("login", {errores: false});
                }
                else{
                    console.log("usuario encontrado");
                    if(password === sol.clave){
                        //actualizamos los datos de la sesion
                        request.session.currentEmail = request.body.usuario;
                        request.session.currentUser = sol.nombre;
                        request.session.currentPassword = sol.clave;

                        response.redirect("principal.html");
                    }
                    else{
                        console.log("la contraseña no coincide");
                        response.render("login", {errores: false});
                    }
                }
            })
        }
        else{ //si hay errores
            response.render("login", {errores:errors.mapped()});
        }
});

app.get("/signup.html", function(request, response){
    response.status(200);
    response.render("signup", {errores: false});
})

app.post("/signup", multerFactory.single('imagen'), 
    check("correo", "campo correo vacio").notEmpty(),
    check("correo", "correo no valido").isEmail(), 
    check("usuario", "campo usuario vacio").notEmpty(),
    check("usuario", "nombre de usuario no valido").custom(espaciosVacio),
    check("clave", "la contraseña no puede estar vacia").notEmpty(),
    check("clave", "la clave debe tener entre 4 y 15 caracteres").isLength({min:4, max:15}),
    check("clave2", "la clave repetida no puede estar vacia").notEmpty(),
    // AÑADIR mas checks en un futuro
    function(request, response){
        const errors = validationResult(request);

        if(errors.isEmpty()){
            daoUser.exist(request.body.correo, (err, sol) =>{
                if(err){
                    console.log(err.message);
                    response.end();
                }
                else if(!sol){ // no existe un usuario con ese correo
                    let nombre_fichero = null;
                    if(request.file){ 
                        nombre_fichero = request.file.buffer;
                    }
                    else{ //en el caso de que el usuario no haya subido una imagen de perfil
                        // le asignamos una por defecto 
                        let numero_al_azar = daoUser.randomNumber();
                        switch(numero_al_azar){
                            case 1:
                                nombre_fichero = fs.readFileSync("images/profile/defecto1.png");
                            break;
                            case 2:
                                nombre_fichero = fs.readFileSync("images/profile/defecto2.png");
                            break;
                            case 3:
                                nombre_fichero = fs.readFileSync("images/profile/defecto3.png");
                            break;
                        }
                    }

                    daoUser.newUser(request.body.correo, request.body.usuario, request.body.clave, nombre_fichero,
                        (err) =>{
                            if(err){
                                console.log(err.message);
                                response.end();
                            }
                            else{
                                console.log("usuario insertado correctamente");
                                response.redirect("login.html");
                            }
                    })
                }
                else{ //el usuario ya esta registrado
                    console.log("usuario ya existente");
                    response.render("signup", {errores: false});
                }
            })
            
        }
        else{ //si hay errores
            response.render("signup", {errores: errors.mapped()});
        }
});

app.get("/logout", function(request, response){
    response.status(200);
    request.session.destroy();
    response.redirect("login.html");
})

app.get("/principal.html", identificacionRequerida, function(request, response){
    response.status(200);
    let usuario = {
        correo: request.session.currentEmail,
        nombre: request.session.currentUser
    }
    response.render("principal", {usuario: usuario});
    //response.type("text/plain; charset=utf-8");
    //response.end();
});

app.get("/imagen/:correo", function(request, response){
    let n = String(request.params.correo);
    
    daoUser.getImage(n, (err, img)=>{
        if(err){
            console.log(err.message);
            response.end();
        }
        else{
            if(img){
                response.end(img);
            }else{
                response.status(404);
                response.end("Not Found");
            }
        }
    })
})

app.get("/preguntas.html", identificacionRequerida, function(request, response){
    response.status(200);
    daoPreguntas.readAll((err, sol)=>{
        if(err){
            console.log(err.message);
            response.end();
        }
        else{
            // convertimos el string de etiquetas en varias etiquetas, dentro del array preguntas
            sol = daoEtiquetas.separarPorComas(sol);
            let usuario = {
                correo: request.session.currentEmail,
                nombre: request.session.currentUser
            }
            response.render("preguntas", {usuario : usuario, preguntas: sol, titulo: "Todas las preguntas"});
        }
    })
})

app.get("/preguntas_etiqueta", identificacionRequerida, function(request, response){
    response.status(200);
    let tag = request.query.tag;
    daoPreguntas.readByEtiqueta(tag, (err, questions)=>{
        if(err){
            console.log(err.message);
            response.end();
        }else{
            questions = daoEtiquetas.separarPorComas(questions);
            let titulo = 'Preguntas con la etiqueta ['+ tag +']';
            let usuario = {
                correo: request.session.currentEmail,
                nombre: request.session.currentUser
            }
            response.render("preguntas", {usuario: usuario, preguntas: questions, titulo: titulo});
        }
    })
})

app.get("/preguntas_sin_responder.html", identificacionRequerida, function(request, response){
    response.status(200);
    daoPreguntas.readByRespondida((err, questions)=>{
        if(err){
            console.log(err.message);
            response.end();
        }else{
            questions = daoEtiquetas.separarPorComas(questions);
            let usuario = {
                correo: request.session.currentEmail,
                nombre: request.session.currentUser
            }
            response.render("preguntas", {usuario: usuario, preguntas: questions, titulo: "Preguntas sin responder"});
        }
    })
})

app.get("/buscar", identificacionRequerida, function(request, response){
    response.status(200);
    daoPreguntas.readByTexto(request.query.texto, (err, questions)=>{
        if(err){
            console.log(err.message);
            response.end();
        }else{
            questions = daoEtiquetas.separarPorComas(questions);
            let titulo = 'Resultados de la busqueda "' + request.query.texto +'"';
            let usuario = {
                correo: request.session.currentEmail,
                nombre: request.session.currentUser
            }
            response.render("preguntas", {usuario: usuario, preguntas: questions, titulo: titulo});
        }
    })
})

app.get("/formular.html", identificacionRequerida, function(request, response){
    response.status(200);
    let usuario = {
        correo: request.session.currentEmail,
        nombre: request.session.currentUser
    }
    response.render("formular", {usuario: usuario, errores: false});
})

app.get("/formular_pregunta",
    check("titulo", "campo titulo vacio").notEmpty(),
    check("cuerpo", "campo cuerpo vacio").notEmpty(),
    check("etiquetas", "las etiquetas no pueden contener espacios en blanco entre ellas").custom(espaciosVacio),
    check("etiquetas", "las etiquetas tienen que empezar por @").custom(empiezaPorArroba),
    check("etiquetas", "no puedes escribir mas de 5 etiquetas").custom(maximo_etiquetas),
    identificacionRequerida, function(request, response){
        const errors = validationResult(request);
        if(!errors.isEmpty()){
            let usuario = {
                correo: request.session.currentEmail,
                nombre: request.session.currentUser
            }
            response.render("formular", {usuario : usuario, errores: errors.mapped()});
        }
        else{
            let etiquetas = request.query.etiquetas;
            let pregunta = {
                titulo: request.query.titulo,
                user: request.session.currentEmail, 
                cuerpo: request.query.cuerpo
            };
            daoPreguntas.create(pregunta, (err, sol)=>{
                if(err){
                    console.log(err.message);
                    response.end();
                }
                else{
                    // ha insertado la pregunta
                    let idQ = sol;

                    //aumentamos el contador de preguntas del usuario
                    daoUser.aumentarContadorPreguntas(pregunta.user, (err)=>{
                        if(err){
                            console.log(err.message);
                            response.end();
                        }
                    })

                    etiquetas = daoEtiquetas.separarPorArrobas(etiquetas);
                    etiquetas.forEach(tag=>{
                        daoEtiquetas.exists(tag, (err, idEtiqueta)=>{
                            if(err){
                                console.log(err.message);
                                response.end();
                            }
                            // si la etiqueta no existe
                            else if(!idEtiqueta){
                                daoEtiquetas.insertTag(tag, (err, idTag)=>{
                                    if(err){
                                        console.log(err.message);
                                        response.end();
                                    }
                                    else{
                                        daoEtiquetas.insertIntermedia(idQ, idTag, (err)=>{
                                            if(err){
                                                console.log(err.message);
                                                response.end();
                                            }
                                            else{
                                                //next();
                                                //response.redirect("preguntas.html"); 
                                                //response.end();
                                            }
                                        })
                                    }
                                })
                            }
                            // si la etiqueta si existe
                            else{
                                daoEtiquetas.insertIntermedia(idQ, idEtiqueta, (err)=>{
                                    if(err){
                                        console.log(err.message);
                                        response.end();
                                    }
                                    else{
                                        //response.redirect("preguntas.html"); 
                                        //response.end();
                                    }
                                })
                            }
                        })
                        
                    });
                    response.redirect("preguntas.html");
                }
            })// termina de crear la pregunta
    }
})

// acceder a la vista de una pregunta
app.get("/vista_pregunta", identificacionRequerida, function(request, response){
    response.status(200);
    let id = request.query.id;
    
    if(id === undefined){
        id = request.session.currentQuestionId;
    }
    else{
        daoPreguntas.visitarPregunta(id, (err)=>{
            if(err){
                console.log(err.message);
                response.end();
            }
        })
    }

    //sacamos la pregunta con ese id
    daoPreguntas.read(id, (err, question) =>{
        if(err){
            console.log(err.message);
            response.end();
        }
        else{
            //sacamos todas las respuestas a esa pregunta
            daoRespuestas.respuestasByPregunta(id, (err, answers)=>{
                if(err){
                    console.log(err.message);
                    response.end();
                }
                else{
                    let usuario = {
                        correo: request.session.currentEmail,
                        nombre: request.session.currentUser
                    }
                    question = daoEtiquetas.separar_etiquetas(question);
                    response.render("vistaPregunta", {usuario: usuario, pregunta: question, respuestas: answers});
                }
            })
        }
    })
})

app.get("/formular_respuesta", identificacionRequerida, function(request, response){
    response.status(200);
    let pregunta_id = request.query.id_pregunta;
    daoRespuestas.insertRespuesta(pregunta_id, request.session.currentEmail, request.query.cuerpo, (err, respuesta_id)=>{
        if(err){
            console.log(err.message);
            response.end();
        }
        else{
            //aumentamos el contador de respuestas del usuario
            daoUser.aumentarContadorRespuestas(request.session.currentEmail, (err)=>{
                if(err){
                    console.log(err.message);
                    response.end();
                }
                else{
                    daoPreguntas.marcarRespondida(pregunta_id, (err)=>{
                        if(err){
                            console.log(err.message);
                            response.end();
                        }
                        else{
                            response.redirect("preguntas.html"); 
                        }
                    })
                }
            })
            //response.end();
        }
    }) 
})

app.get("/votar_pregunta/:id/:tipo", identificacionRequerida, function(request, response){
    response.status(200);
    let pregunta_id = String(request.params.id);
    let tipo = String(request.params.tipo);
    if(tipo === "positivo"){
        daoPreguntas.votoPositivo(pregunta_id, (err)=>{
            if(err){
                console.log(err.message);
                response.end();
            }
            else{
                //todo ha ido bien
                request.session.currentQuestionId = pregunta_id;
                response.redirect("/vista_pregunta");
            }
        })
    }
    else{
        daoPreguntas.votoNegativo(pregunta_id, (err)=>{
            if(err){
                console.log(err.message);
                response.end();
            }
            else{
                //todo a ido bien
                request.session.currentQuestionId = pregunta_id;
                response.redirect("/vista_pregunta");
            }
        })
    }
})

app.get("/votar_respuesta/:id_pregunta/:tipo/:id_respuesta", identificacionRequerida, function(request, response){
    response.status(200);
    let pregunta_id = String(request.params.id_pregunta);
    let respuesta_id = String(request.params.id_respuesta);
    let tipo = String(request.params.tipo);
    if(tipo === "positivo"){
        daoRespuestas.votoPositivo(respuesta_id, (err)=>{
            if(err){
                console.log(err.message);
                response.end();
            }
            else{
                //todo ha ido bien
                request.session.currentQuestionId = pregunta_id;
                response.redirect("/vista_pregunta");
            }
        })
    }
    else{
        daoRespuestas.votoNegativo(respuesta_id, (err)=>{
            if(err){
                console.log(err.message);
                response.end();
            }
            else{
                //todo a ido bien
                request.session.currentQuestionId = pregunta_id;
                response.redirect("/vista_pregunta");
            }
        })
    }
})

app.get("/perfil_usuario", identificacionRequerida, function(request, response){
    response.status(200);
    let usuario = request.query.usuario;

    // sacamos los datos del usuario
    daoUser.exist(usuario, (err, usuario_consultado)=>{
        if(err){
            console.log(err.message);
            response.end();
        }
        else{
            //sacamos la informacion de las preguntas
            daoPreguntas.readByUser(usuario, (err, info_preguntas)=>{
            if(err){
                console.log(err.message);
                response.end();
            }
            else{
                //sacamos la informacion de las respuestas
                daoRespuestas.readByUser(usuario, (err, info_respuestas) =>{
                    if(err){
                        console.log(err.message);
                        response.end();
                    }
                    else{
                        let medallas_preguntas = daoUser.gestionarMedallasPreguntas(info_preguntas);
                        let medallas_respuestas = daoUser.gestionarMedallasRespuestas(info_respuestas);
                        let medallas_visitas = daoUser.gestionarMedallasVisitas(info_preguntas);

                        let reputacion = 10*(medallas_preguntas.total_positivos) - 2*(medallas_preguntas.total_negativos) +10*(medallas_respuestas.total_positivos)
                        - 2*(medallas_respuestas.total_negativos) ;
                        if(reputacion < 1){
                            reputacion = 1;
                        }
                        let usuario = {
                            correo: request.session.currentEmail,
                            nombre: request.session.currentUser,
                            usuario_visitado: usuario_consultado.nombre,
                            correo_visitado: usuario_consultado.correo,
                            fecha: usuario_consultado.fecha_alta,
                            reputacion: reputacion,
                            n_preguntas: usuario_consultado.num_preg_form,
                            n_respuestas: usuario_consultado.num_resp_pub,
                            medallas_p : medallas_preguntas,
                            medallas_r: medallas_respuestas,
                            medallas_v: medallas_visitas
                        }

                        // actualizar reputacion
                        actualizarReputacion(reputacion, usuario.correo_visitado);

                        response.render("perfil", {usuario: usuario});
                    }
                })
        }
    })      
        }
    })
})

app.get("/usuarios", identificacionRequerida, function(request, response){
    response.status(200);
    daoUser.readAll((err, users)=>{
        if(err){
            console.log(err.message);
            response.end();
        }
        else{
            //sacamos todos los usuarios de la BBDD
            
            let usuario = {
                correo: request.session.currentEmail,
                nombre: request.session.currentUser
            }
            response.render("usuarios", {usuario: usuario, users: users, titulo: "Todos los usuarios"});
        }
    })
})

app.get("/usuarios_por_nombre", identificacionRequerida, function(request, response){
    response.status(200);
    daoUser.readByName(request.query.nombre, (err, users)=>{
        if(err){
            console.log(err.message);
            response.end();
        }
        else{
            //sacamos todos los usuarios de la BBDD
            
            let usuario = {
                correo: request.session.currentEmail,
                nombre: request.session.currentUser
            }
            response.render("usuarios", {usuario: usuario, users: users, titulo: 'Usarios filtrados por ["'+request.query.nombre+'"]'});
        }
    })
})

app.use(function(request, response){
    response.status(404);
    response.render("404", {url:request.url});
    //response.end();
})

app.use(function(request, response){
    response.status(500);
    response.render("500", {url:request.url});
    //response.end();
})

app.listen(3000, function(err){
    if(err){
        console.log("Error al inicializar el servidor");
    }
    else{
        console.log("Servidor lanzado en el puerto 3000");
    }
})