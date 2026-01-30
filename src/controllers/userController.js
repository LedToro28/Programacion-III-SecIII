const bcrypt = require ("bcrypt");
const { error } = require("console");
const { use } = require("i18next");
const jwt = require ("jsonwebtoken");
const { json } = require("stream/consumers");

//base de datos ficticia

let user = [];

const register = async (req, res) => {
    const {Nombre, Email, Password, Nivel} = req.body;

    //validacion basica
    if (!Nombre, !Email, Password, !Nivel) {
        return res.status(400).json ({ Error: "Todos Los Campos Son Obligatorios"});
    }

    //Incriptar clave

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash (Password, salt);

    const newUser = {Nombre, Email, Password: hashedPassword, Nivel};
    user.push (newUser);

    res.status(201),json ({message: "Usuario Registrado con Exito" });
};

const login = async (req, res) => {
    const { Email, Password} = req.body;
    const user = users.find(u => u.Email === Email);
    
    if (!user) return res.status (404),json ({ Error: "Usuario no Encontrado"});

    //comparar claves incriptadas

    const isMatch = await bcrypt.compare (Password, user.Password);
    if (!isMatch) res.status (400).json ({error: "Contraseña Incorrect"});

    //generar token
    const token = jwt.sign ({ Email:user.Email, Nivel: user.Nivel}, "Token Seguro", {expiresIn: "1h"});

    res.json ({token});
};

module.exports = {register, login};