router.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('Richiesta a /api/upload ricevuta');
        console.log('req.file:', req.file);
        console.log('req.body:', req.body);

        // VERIFICA ESPLICITA DEI CAMPI
        const { postId, userId } = req.body;

        if (!postId) {
            console.log('PostId mancante');
            return res.status(400).json({ 
                success: false, 
                error: 'postId mancante',
                receivedData: req.body 
            });
        }

        if (!userId) {
            console.log('UserId mancante');
            return res.status(400).json({ 
                success: false, 
                error: 'userId mancante',
                receivedData: req.body 
            });
        }

        if (!req.file) {
            console.log('Nessun file caricato');
            return res.status(400).json({ 
                success: false,
                error: 'Nessun file caricato' 
            });
        }

        const fileDoc = new File({
            filename: req.file.filename,
            originalName: req.file.originalname,
            fileId: req.file.id,
            mimetype: req.file.mimetype,
            size: req.file.size,
            postId: postId,  // Usa il postId estratto dal body
            userId: userId   // Aggiungi userId se necessario
        });

        await fileDoc.save();

        // Costruisci l'URL del file
        const fileUrl = `${req.protocol}://${req.get('host')}/api/media/files/${fileDoc.filename}`;

        res.status(201).json({
            success: true,
            file: {
                id: fileDoc._id,
                filename: fileDoc.filename,
                url: fileUrl,
                originalName: fileDoc.originalName,
                mimetype: fileDoc.mimetype,
                size: fileDoc.size
            },
            postId,
            userId
        });
    } catch (error) {
        console.error('Errore upload:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});