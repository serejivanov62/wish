import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

// MUI Imports
import { Button, TextField, Typography, Box, Paper, Stack, Avatar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

function AddFriendForm({ onFriendAdd, onShowSnackbar }) {
    const { t } = useTranslation();
    const [phone, setPhone] = useState('');
    const [phoneError, setPhoneError] = useState(false);

    const validatePhone = (phoneNum) => {
        const phoneRegex = /^\+\d{10,15}$/;
        return phoneRegex.test(phoneNum);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let isValid = true;

        if (!validatePhone(phone)) {
            setPhoneError(true);
            isValid = false;
        } else {
            setPhoneError(false);
        }

        if (!isValid) {
            onShowSnackbar(t('validation_error'), 'error');
            return;
        }

        axios.post(`/api/friends`, { phone })
            .then(response => {
                onFriendAdd(response.data);
                setPhone('');
                onShowSnackbar(t('friend_added_success'), 'success');
            })
            .catch(err => {
                console.error('Failed to add friend', err);
                onShowSnackbar(err.response?.data?.detail || t('add_friend_failed'), 'error');
            });
    };

    return (
        <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h5" gutterBottom>{t('add_friend')}</Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label={t('friend_phone')}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    fullWidth
                    error={phoneError}
                    helperText={phoneError && t('friend_phone_validation_error')}
                />
                <Button type="submit" variant="contained" color="primary">
                    {t('add_friend_button')}
                </Button>
            </Box>
        </Paper>
    );
}

export default function Friends({ user, onViewFriendWishes, onShowSnackbar }) {
    const { t } = useTranslation();
    const [friends, setFriends] = useState([]);
    const [error, setError] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [friendToDelete, setFriendToDelete] = useState(null);

    const fetchFriends = useCallback(() => {
        if (!user) return;
        axios.get(`/api/friends`)
            .then(response => {
                setFriends(response.data);
            })
            .catch(err => {
                console.error('Failed to fetch friends:', err);
                setError(t('fetch_friends_failed'));
            });
    }, [user, t]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    const handleFriendAdd = (newFriend) => {
        setFriends(prevFriends => [...prevFriends, newFriend]);
    };

    const handleDeleteClick = (friend) => {
        setFriendToDelete(friend);
        setOpenDeleteDialog(true);
    };

    const confirmDeleteFriend = () => {
        if (friendToDelete) {
            axios.delete(`/api/friends/${friendToDelete.id}`)
                .then(() => {
                    setFriends(prevFriends => prevFriends.filter(f => f.id !== friendToDelete.id));
                    setOpenDeleteDialog(false);
                    setFriendToDelete(null);
                    onShowSnackbar(t('friend_deleted_success'), 'success');
                })
                .catch(err => {
                    console.error('Failed to delete friend', err);
                    onShowSnackbar(t('friend_delete_failed'), 'error');
                });
        }
    };

    return (
        <Box>
            <AddFriendForm onFriendAdd={handleFriendAdd} onShowSnackbar={onShowSnackbar} />
            {error && <Typography color="error">{error}</Typography>}
            <Stack spacing={2} sx={{ mt: 2 }}>
                {friends.length > 0 ? (
                    friends.map(friend => (
                        <Paper key={friend.id} elevation={1} sx={{ p: 2, bgcolor: 'background.paper' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Stack direction="row" alignItems="center" spacing={2} onClick={() => onViewFriendWishes(friend)} sx={{ cursor: 'pointer' }}>
                                    <Avatar alt={friend.name} src={friend.avatar_url} />
                                    <Typography variant="h6">{friend.name}</Typography>
                                </Stack>
                                <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteClick(friend); }} color="secondary">
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        </Paper>
                    ))
                ) : (
                    <Typography>{t('no_friends')}</Typography>
                )}
            </Stack>

            {/* Delete Friend Confirmation Dialog */}
            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>{t('confirm_delete_friend_title')}</DialogTitle>
                <DialogContent>
                    <Typography>{t('confirm_delete_friend_message', { name: friendToDelete?.name })}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>{t('cancel')}</Button>
                    <Button onClick={confirmDeleteFriend} variant="contained" color="primary">{t('delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
