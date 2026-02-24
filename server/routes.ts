import { Router, Request, Response } from 'express';
import UserModel from '../models/UserModel';

const router = Router();

// GET /api/users/:id
router.get('/api/users/:id', async (req: Request, res: Response) => {
    const userId = req.params.id;
    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/users/:id
router.patch('/api/users/:id', async (req: Request, res: Response) => {
    const userId = req.params.id;
    try {
        const updatedUser = await UserModel.findByIdAndUpdate(userId, req.body, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PATCH /api/users/:id/admin
router.patch('/api/users/:id/admin', async (req: Request, res: Response) => {
    const userId = req.params.id;
    try {
        const updatedUser = await UserModel.findByIdAndUpdate(userId, req.body, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;