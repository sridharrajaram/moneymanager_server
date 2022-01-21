const express = require('express');
const Expense = require('../model/expenseModel');

const router = express.Router();

router.get('/',(req, res) => {
    Expense.find()
        .then(expenses => res.json(expenses))
        .catch(err => res.status(400).json('Error: '+ err));
});

router.post('/addExpense', (req, res) => {
    
    const {title, amount, date} = req.body;

    const newExpense = new Expense({
        title,
        amount,
        date
    });

    newExpense.save()
        .then(() => res.json('expense added successfully'))
        .catch( err => res.status(400).json('Error: ' + err))

});

module.exports = router;