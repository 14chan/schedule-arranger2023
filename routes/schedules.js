const express = require('express');
const router = express.Router();
const authenticationEnsurer = require('./authentication-ensurer');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({log: ['query']});

router.get('/new', authenticationEnsurer ,(req, res, next) => {
  res.render('new', { title: 'Express', user: req.user});
});

router.post('/',authenticationEnsurer, async(req, res, next) => {
  const scheduleId = uuidv4();
  const updatedAt = new Date();
  const schedule = await prisma.schedule.create({
    data: {
      scheduleId: scheduleId,
      scheduleName: req.body.scheduleName.slice(0, 255) || '(名称未設定)',
      memo: req.body.memo,
      createdBy: parseInt(req.user.id),
      updatedAt: updatedAt
    }
  });
  const candidateNames = req.body.candidates.split('\n').map((s) => s.trim()).filter((s) => s !== '');
  const candidates = candidateNames.map((c) => ({
    candidateName: c,
    scheduleId: schedule.scheduleId
  }));
  await prisma.candidate.createMany({
    data: candidates
  });
  res.redirect('/schedules/' + schedule.scheduleId);
});

router.get('/:scheduleId', authenticationEnsurer, async(req, res, next) => {
  const schedule = await prisma.schedule.findUnique({
    where: { scheduleId: req.params.scheduleId },
    include: {
      user: {
        select: {
          userId: true,
          username: true
        }
      }
    }
  });
  if(schedule) {
    const candidates = await prisma.candidate.findMany({
      where: { scheduleId: schedule.scheduleId },
      orderBy: { candidateId: 'asc' }
    });
    res.render('schedule', {
      user: req.user,
      schedule: schedule,
      candidates: candidates,
      users: [ req.user ]
    });
  } else {
    const err = new Error('指定された予定は見つかりません');
    err.status = 404;
    next(err);
  }
});


module.exports = router;