const express = require('express');
const Student = require('../models/Student');

const router = express.Router();

// Get a student by institution ID
router.get('/:institutionId', async (req, res) => {
  try {
    const { institutionId } = req.params;

    const student = await Student.findOne({
      institutionId
    }).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error fetching student:', error);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;