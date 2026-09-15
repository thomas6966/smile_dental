const { Router } = require('express');
const ctrl = require('../controllers/clientController');
const { telegramAuth } = require('../middlewares/auth.middleware');

const router = Router();

router.use(telegramAuth);

router.get('/bootstrap', ctrl.bootstrap);
router.patch('/me', ctrl.updateMe);

router.get('/doctors/:id/calendar', ctrl.calendar);
router.get('/doctors/:id/slots', ctrl.slots);

router.get('/appointments', ctrl.appointments);
router.post('/appointments', ctrl.createAppointment);
router.post('/appointments/:id/cancel', ctrl.cancelAppointment);
router.post('/appointments/:id/reschedule', ctrl.rescheduleAppointment);
router.post('/appointments/:id/rate', ctrl.rateAppointment);

module.exports = router;
