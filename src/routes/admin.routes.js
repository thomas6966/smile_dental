const crypto = require('crypto');
const fs = require('fs');
const { Router } = require('express');
const multer = require('multer');
const config = require('../config/default');
const ctrl = require('../controllers/adminController');
const { adminAuth, loginLimiter } = require('../middlewares/auth.middleware');

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(config.paths.uploads, { recursive: true });
      cb(null, config.paths.uploads);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${IMAGE_TYPES[file.mimetype]}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, Boolean(IMAGE_TYPES[file.mimetype])),
});

const router = Router();

router.post('/auth/login', loginLimiter, ctrl.login);

router.use(adminAuth);

router.get('/auth/me', ctrl.me);
router.post('/auth/password', ctrl.changePassword);

router.get('/dashboard', ctrl.dashboard);
router.get('/system', ctrl.system);

router.get('/notifications', ctrl.notifications);
router.post('/notifications/read', ctrl.readNotifications);

router.get('/calendar', ctrl.calendar);
router.get('/slots', ctrl.slots);

router.get('/appointments', ctrl.listAppointments);
router.post('/appointments', ctrl.createAppointment);
router.get('/appointments/:id', ctrl.getAppointment);
router.patch('/appointments/:id', ctrl.updateAppointment);
router.post('/appointments/:id/status', ctrl.setStatus);
router.delete('/appointments/:id', ctrl.deleteAppointment);

router.get('/patients', ctrl.listPatients);
router.post('/patients', ctrl.createPatient);
router.get('/patients/:id', ctrl.getPatient);
router.patch('/patients/:id', ctrl.updatePatient);
router.delete('/patients/:id', ctrl.deletePatient);
router.post('/patients/:id/message', ctrl.messagePatient);
router.post('/patients/:id/checkup-reminder', ctrl.sendCheckupReminder);

router.get('/categories', ctrl.listCategories);
router.post('/categories', ctrl.createCategory);
router.put('/categories/:id', ctrl.updateCategory);
router.delete('/categories/:id', ctrl.deleteCategory);

router.get('/services', ctrl.listServices);
router.post('/services', ctrl.createService);
router.put('/services/:id', ctrl.updateService);
router.delete('/services/:id', ctrl.deleteService);

router.get('/doctors', ctrl.listDoctors);
router.post('/doctors', ctrl.createDoctor);
router.put('/doctors/:id', ctrl.updateDoctor);
router.delete('/doctors/:id', ctrl.deleteDoctor);

router.get('/time-offs', ctrl.listTimeOffs);
router.post('/time-offs', ctrl.createTimeOff);
router.delete('/time-offs/:id', ctrl.deleteTimeOff);

router.get('/broadcasts', ctrl.listBroadcasts);
router.get('/broadcasts/audience', ctrl.broadcastAudience);
router.post('/broadcasts', ctrl.createBroadcast);

router.get('/settings', ctrl.getSettings);
router.put('/settings', ctrl.updateSettings);
router.post('/demo/clear', ctrl.clearDemo);

router.get('/admins', ctrl.listAdmins);
router.post('/admins', ctrl.createAdmin);
router.delete('/admins/:id', ctrl.deleteAdmin);

router.post('/upload', upload.single('file'), ctrl.upload);

module.exports = router;
