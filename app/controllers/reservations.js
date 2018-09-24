const knex = require('../../db.js');

const MIN_GUESTS = 1;
const MAX_GUESTS = 10;
const MIN_DURATION = 0.5;
const MAX_DURATION = 6.0;

function testISODate(value) {
  return /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\\.[0-9]+)?(Z)?$/.test(value);
}

class ValidateError extends Error {
}


class NotFoundError extends Error {
}


class ConflictError extends Error {
}

function validateCreateReservationParameters(req) {
  const { reservation } = req.body;
  if (typeof reservation === 'undefined') {
    throw new ValidateError('Object reservation is required');
  }

  const guests = parseInt(reservation.guests, 10);
  if (Number.isNaN(guests)) {
    throw new ValidateError('parameter guests must be integer');
  }

  if (guests > MAX_GUESTS || guests < MIN_GUESTS) {
    throw new ValidateError(`parameter guests must be in range >=${MIN_GUESTS} and <= ${MAX_GUESTS}`);
  }

  if (!testISODate(reservation.time)) {
    throw new ValidateError('time does not match the following format yyyy-MM-ddThh:mm:ssZ or it’s not a valid date/time.');
  }

  const time = new Date(reservation.time);
  if (Number.isNaN(time.getTime())) {
    throw new ValidateError('it’s not a valid date/time.');
  }

  const duration = parseFloat(reservation.duration);
  if (Number.isNaN(duration)) {
    throw new ValidateError('parameter duration must be float');
  }

  if (duration > MAX_DURATION || duration < MIN_DURATION) {
    throw new ValidateError(`parameter duration must be in range >=${MIN_DURATION} and <= ${MAX_DURATION}`);
  }

  return [guests, time, duration];
}

function createReservationInTransaction(trx, start, end, guests, doUpdate) {
  return trx('tables')
    .column('tables.id')
    .leftJoin('reservations', function () {
      this.on('tables.id', '=', 'reservations.table_id')
        .on(function () {
          return this.onBetween('reservations.start', [start, end])
            .orOnBetween('reservations.end', [start, end]);
        });
    })
    .where('tables.capacity', '>=', guests)
    .whereNull('reservations.table_id')
    .orderBy('tables.capacity', 'asc')
    .then((rows) => {
      if (rows.length === 0) {
        if (doUpdate) {
          throw new ConflictError('There are no free tables for this period of time');
        }

        throw new NotFoundError('There are no free tables for this period of time');
      }

      return trx('reservations')
        .insert({
          table_id: rows[0].id,
          start,
          end,
          guests,
        }).then(id => id);
    });
}

function createOrUpdateReservation(req, res, id) {
  knex.transaction((trx) => {
    const [guests, start, duration] = validateCreateReservationParameters(req);
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

    const doUpdate = typeof id !== 'undefined';
    if (doUpdate) {
      return trx('reservations').where('id', id).del().then((affectedRows) => {
        if (affectedRows === 0) {
          throw new NotFoundError(`There are no reservations with id=${id}`);
        }

        return createReservationInTransaction(trx, start, end, guests, doUpdate);
      });
    }

    return createReservationInTransaction(trx, start, end, guests, doUpdate);
  })
    .then(() => {
      console.log(`Location: /api/reservations/${id}`);
      res.status(201).location(`Location: /api/reservations/${id}`).send();
    }).catch((err) => {
      let status = 400;
      if (err instanceof NotFoundError) {
        status = 404;
      } else if (err instanceof ConflictError) {
        status = 409;
      }

      console.log(`${status} : ${err}`);
      res.status(status).send();
    });
}

class Reservations {
  static createReservation(req, res) {
    createOrUpdateReservation(req, res);
  }

  static getReservationInfo(req, res) {
    const id = req.params.reservation_id;
    if (Number.isNaN(id)) {
      res.status(400).send('parameter id must be integer');
      return;
    }

    knex('tables')
      .innerJoin('reservations', 'tables.id', 'reservations.table_id')
      .where('reservations.id', id)
      .then((rows) => {
        if (rows.length === 0) {
          res.status(404).send(`There are no reservations with id=${id}`);
          return;
        }

        const row = rows[0];
        const result = {
          reservation: {
            id: row.id,
            guests: row.guests,
            start: (new Date(row.start)).toISOString(),
            end: (new Date(row.end)).toISOString(),
            table: {
              number: row.number,
              capacity: row.capacity,
            },
          },
        };
        res.status(200).send(result);
      });
  }

  static updateReservation(req, res) {
    const id = req.params.reservation_id;
    if (Number.isNaN(id)) {
      res.status(400).send('parameter id must be integer');
      return;
    }

    createOrUpdateReservation(req, res, id);
  }

  static deleteReservation(req, res) {
    const id = req.params.reservation_id;
    if (Number.isNaN(id)) {
      res.status(400).send('parameter id must be integer');
      return;
    }

    knex('reservations').where('id', id).del().then((affectedRows) => {
      if (affectedRows === 0) {
        res.status(404).send(`There are no reservations with id=${id}`);
        return;
      }

      res.sendStatus(204);
    });
  }
}

module.exports = Reservations;
