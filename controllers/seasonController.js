const firebaseStore = require('../models/firebase');
const catchAsync = require('../middlewares/catchAsync');

exports.list = catchAsync(async (req, res) => {
    const { gardenId } = req.query;
    const data = await firebaseStore.getSeasons(req.user, gardenId);
    res.status(200).json({ status: 'success', data });
});

exports.create = catchAsync(async (req, res) => {
    const id = await firebaseStore.addSeason(req.user, req.body);
    res.status(201).json({ status: 'success', id });
});

exports.update = catchAsync(async (req, res) => {
    const { id } = req.params;
    await firebaseStore.updateSeason(req.user, id, req.body);
    res.status(200).json({ status: 'success' });
});

exports.remove = catchAsync(async (req, res) => {
    const { id } = req.params;
    await firebaseStore.deleteSeason(req.user, id);
    res.status(200).json({ status: 'success' });
});