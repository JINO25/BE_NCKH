const firebaseStore = require('../models/firebase');
const catchAsync = require('../middlewares/catchAsync');

exports.list = catchAsync(async (req, res) => {
    const data = await firebaseStore.getCropTypes(req.user);
    res.status(200).json({ status: 'success', data });
});

exports.create = catchAsync(async (req, res) => {
    const id = await firebaseStore.addCropType(req.user, req.body);
    res.status(201).json({ status: 'success', id });
});

exports.update = catchAsync(async (req, res) => {
    const { id } = req.params;
    await firebaseStore.updateCropType(req.user, id, req.body);
    res.status(200).json({ status: 'success' });
});

exports.remove = catchAsync(async (req, res) => {
    const { id } = req.params;
    await firebaseStore.deleteCropType(req.user, id);
    res.status(200).json({ status: 'success' });
});