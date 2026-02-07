const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Base de datos ficticia
let users = []; // Cambié el nombre a 'users' para mayor claridad

const register = async (req, res) => {
    const { Nombre, Email, Password, Nivel } = req.body;

    // Validación básica
    if (!Nombre || !Email || !Password || !Nivel) {
        return res.status(400).json({ Error: "Todos Los Campos Son Obligatorios" });
    }

    // Encriptar clave
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    const newUser = { Nombre, Email, Password: hashedPassword, Nivel };
    users.push(newUser);

    res.status(201).json({ message: "Usuario Registrado con Exito" });
};

const login = async (req, res) => {
    const { Email, Password } = req.body;
    const user = users.find(u => u.Email === Email);
    
    if (!user) return res.status(404).json({ Error: "Usuario no Encontrado" });

    // Comparar claves encriptadas
    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) return res.status(400).json({ error: "Contraseña Incorrecta" });

    // Generar token
    const token = jwt.sign({ Email: user.Email, Nivel: user.Nivel }, "Token Seguro", { expiresIn: "1h" });

    res.json({ token });
};

module.exports = { register, login };