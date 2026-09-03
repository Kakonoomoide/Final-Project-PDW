const sequelize = require('../config/database');
const User = require('./user.model');
const ChatMessage = require('./chatMessage.model'); // M5
const Trip = require('./trip.model'); // M5
const Preference = require('./preference.model'); // M5
const Itinerary = require('./itinerary.model'); // M5
const ItineraryDay = require('./itineraryDay.model'); // M5
const Activity = require('./activity.model'); // M5
const Destination = require('./destination.model'); // M3, M4
const Article = require('./article.model'); // M1, M2

// riwayat chat nempel ke user yang login (1 user punya banyak pesan)
User.hasMany(ChatMessage, { foreignKey: 'userId', onDelete: 'CASCADE' });
ChatMessage.belongsTo(User, { foreignKey: 'userId' });

// Rantai kepemilikan trip:
//   user -> trip -> itinerary (versi) -> hari -> aktivitas
//
// CASCADE dipasang di TIAP tingkat, bukan cuma di paling atas. Alasannya
// SQLite gak otomatis nurunin cascade lintas beberapa level - tanpa ini,
// hapus 1 trip bakal ninggalin baris yatim di `activities` yang gak
// keliatan di mana-mana tapi numpuk terus di database.
User.hasMany(Trip, { foreignKey: 'userId', onDelete: 'CASCADE' });
Trip.belongsTo(User, { foreignKey: 'userId' });

Trip.hasOne(Preference, { foreignKey: 'tripId', as: 'preference', onDelete: 'CASCADE' });
Preference.belongsTo(Trip, { foreignKey: 'tripId' });

Trip.hasMany(Itinerary, { foreignKey: 'tripId', as: 'itineraries', onDelete: 'CASCADE' });
Itinerary.belongsTo(Trip, { foreignKey: 'tripId' });

Itinerary.hasMany(ItineraryDay, { foreignKey: 'itineraryId', as: 'days', onDelete: 'CASCADE' });
ItineraryDay.belongsTo(Itinerary, { foreignKey: 'itineraryId' });

ItineraryDay.hasMany(Activity, { foreignKey: 'itineraryDayId', as: 'activities', onDelete: 'CASCADE' });
Activity.belongsTo(ItineraryDay, { foreignKey: 'itineraryDayId' });

// Konten kurasi admin. Sengaja SET NULL, BUKAN CASCADE: kalau akun admin
// dihapus, artikel & destinasinya jangan ikut hilang - itu konten publik
// yang gak ada hubungannya sama nasib akun penulisnya.
User.hasMany(Destination, { foreignKey: 'createdBy', onDelete: 'SET NULL' });
Destination.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });

User.hasMany(Article, { foreignKey: 'createdBy', onDelete: 'SET NULL' });
Article.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });

module.exports = {
  sequelize,
  User,
  ChatMessage,
  Trip,
  Preference,
  Itinerary,
  ItineraryDay,
  Activity,
  Destination,
  Article,
};
