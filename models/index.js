const sequelize = require("../config/database");
const User = require("./user.model");
const ChatMessage = require("./chatMessage.model"); // M5

// riwayat chat nempel ke user yang login (1 user punya banyak pesan)
User.hasMany(ChatMessage, { foreignKey: "userId", onDelete: "CASCADE" });
ChatMessage.belongsTo(User, { foreignKey: "userId" });

module.exports = { sequelize, User, ChatMessage };
