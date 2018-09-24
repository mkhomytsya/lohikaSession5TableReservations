const express = require('express');
const router  = express.Router();

const reservationsCtrl = require('../controllers/reservations');

router.route('/reservations').post(reservationsCtrl.createReservation);

router.route('/reservations/:reservation_id')
.get(reservationsCtrl.getReservationInfo)
.put(reservationsCtrl.updateReservation)
.delete(reservationsCtrl.deleteReservation);

module.exports = router;