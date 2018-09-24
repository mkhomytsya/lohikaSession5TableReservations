const express      = require('express');
const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');

const reservationsRoutes = require('./app/routes/reservations');

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

app.use('/api', reservationsRoutes);

app.listen(8080, () => {
    console.log('App is running on port 8080');
});