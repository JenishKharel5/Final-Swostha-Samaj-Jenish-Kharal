app.get('/services', (req, res) => {
    res.render('services', {
        error: req.flash('error')
    });
});
