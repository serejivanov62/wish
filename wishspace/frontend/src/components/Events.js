import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

// MUI Imports
import { Button, TextField, Typography, Box, Paper, Select, MenuItem, FormControl, InputLabel, Stack, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Snackbar, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function CreateEventForm({ onEventCreate, onShowSnackbar }) {
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [titleError, setTitleError] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        let isValid = true;

        if (title.trim().length < 1 || title.trim().length > 255) {
            setTitleError(true);
            isValid = false;
        } else {
            setTitleError(false);
        }

        if (!isValid) {
            onShowSnackbar(t('validation_error'), 'error');
            return;
        }

        axios.post(`/api/events`, { title })
            .then(response => {
                onEventCreate(response.data);
                setTitle('');
                onShowSnackbar(t('event_added_success'), 'success');
            })
            .catch(err => {
                console.error('Failed to create event', err);
                onShowSnackbar(err.response?.data?.detail || t('event_add_failed'), 'error');
            });
    };

    return (
        <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h5" gutterBottom>{t('create_new_event')}</Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label={t('event_title_required')}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    fullWidth
                    error={titleError}
                    helperText={titleError && t('event_title_validation_error')}
                />
                <Button type="submit" variant="contained" color="primary">
                    {t('create_event')}
                </Button>
            </Box>
        </Paper>
    );
}

function EventDetailView({ user, event, onBack, onEventUpdated, onEventDeleted, onShowSnackbar }) {
    const { t } = useTranslation();
    const [availableItems, setAvailableItems] = useState([]);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [eventItems, setEventItems] = useState(event.items || []);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(event);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

    const fetchAvailableItems = useCallback(() => {
        axios.get(`/api/items`)
            .then(response => {
                const currentEventItemIds = new Set(eventItems.map(item => item.id));
                const filteredItems = response.data.filter(item => !currentEventItemIds.has(item.id));
                setAvailableItems(filteredItems);
                if (filteredItems.length > 0) {
                    setSelectedItemId(filteredItems[0].id);
                }
            })
            .catch(err => console.error('Failed to fetch available items', err));
    }, [user.id, eventItems]);

    useEffect(() => {
        fetchAvailableItems();
    }, [fetchAvailableItems]);

    const handleAddItemToEvent = () => {
        if (!selectedItemId) return;
        axios.post(`/api/events/${event.id}/items`, { item_id: selectedItemId })
            .then(response => {
                const addedItem = availableItems.find(item => item.id === parseInt(selectedItemId));
                if (addedItem) {
                    setEventItems(prev => [...prev, addedItem]);
                    setAvailableItems(prev => prev.filter(item => item.id !== parseInt(selectedItemId)));
                    setSelectedItemId(availableItems.length > 1 ? availableItems[0].id : '');
                    onShowSnackbar(t('item_added_to_event_success'), 'success');
                }
            })
            .catch(err => {
                console.error('Failed to add item to event', err);
                onShowSnackbar(t('item_add_to_event_failed'), 'error');
            });
    };

    const handleEditClick = () => {
        setCurrentEvent(event);
        setOpenEditDialog(true);
    };

    const handleDeleteClick = () => {
        setOpenDeleteConfirm(true);
    };

    const confirmDeleteEvent = () => {
        axios.delete(`/api/events/${event.id}`)
            .then(() => {
                onEventDeleted(event.id);
                onBack(); // Go back to event list after deletion
                onShowSnackbar(t('event_deleted_success'), 'success');
            })
            .catch(err => {
                console.error('Failed to delete event', err);
                onShowSnackbar(t('event_delete_failed'), 'error');
            });
    };

    const handleSaveEdit = (editedEvent) => {
        // Basic frontend validation for edited event
        let isValid = true;
        if (editedEvent.title.trim().length < 1 || editedEvent.title.trim().length > 255) {
            onShowSnackbar(t('event_title_validation_error'), 'error');
            isValid = false;
        }
        if (!isValid) return;

        axios.put(`/api/events/${editedEvent.id}`, editedEvent)
            .then(response => {
                onEventUpdated(response.data);
                setOpenEditDialog(false);
                onShowSnackbar(t('event_updated_success'), 'success');
            })
            .catch(err => {
                console.error('Failed to update event', err);
                onShowSnackbar(t('event_update_failed'), 'error');
            });
    };

    return (
        <Box>
            <Button variant="outlined" onClick={onBack} sx={{ mb: 2 }}>&larr; {t('back_to_events')}</Button>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" gutterBottom>{event.title}</Typography>
                <Box>
                    <IconButton onClick={handleEditClick} color="primary">
                        <EditIcon />
                    </IconButton>
                    <IconButton onClick={handleDeleteClick} color="secondary">
                        <DeleteIcon />
                    </IconButton>
                </Box>
            </Box>

            <Typography variant="h5" sx={{ mt: 3, mb: 2 }}>{t('items_in_event')}</Typography>
            <Stack spacing={1} sx={{ mb: 3 }}>
                {eventItems.length > 0 ? (
                    eventItems.map(item => (
                        <Paper key={item.id} elevation={1} sx={{ p: 2, bgcolor: 'background.default' }}>
                            <Typography variant="body1">{item.title} - ${item.price}</Typography>
                        </Paper>
                    ))
                ) : (
                    <Typography>{t('no_items_in_event')}</Typography>
                )}
            </Stack>

            {availableItems.length > 0 && (
                <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
                    <Typography variant="h5" gutterBottom>{t('add_item_to_event')}</Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>{t('select_item')}</InputLabel>
                        <Select
                            value={selectedItemId}
                            label={t('select_item')}
                            onChange={e => setSelectedItemId(e.target.value)}
                        >
                            {availableItems.map(item => (
                                <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button variant="contained" color="primary" onClick={handleAddItemToEvent}>
                        {t('add_selected_item')}
                    </Button>
                </Paper>
            )}

            {currentEvent && (
                <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
                    <DialogTitle>{t('edit_event')}</DialogTitle>
                    <DialogContent>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <TextField
                                label={t('event_title_required')}
                                value={currentEvent.title}
                                onChange={e => setCurrentEvent({ ...currentEvent, title: e.target.value })}
                                fullWidth
                                error={currentEvent.title.trim().length < 1 || currentEvent.title.trim().length > 255}
                                helperText={(currentEvent.title.trim().length < 1 || currentEvent.title.trim().length > 255) && t('event_title_validation_error')}
                            />
                            {/* Add other fields like description, date if needed */}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenEditDialog(false)}>{t('cancel')}</Button>
                        <Button onClick={() => handleSaveEdit(currentEvent)} variant="contained" color="primary">{t('save')}</Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Delete Event Confirmation Dialog */}
            <Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)}>
                <DialogTitle>{t('confirm_delete_event_title')}</DialogTitle>
                <DialogContent>
                    <Typography>{t('confirm_delete_event_message', { title: event.title })}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteConfirm(false)}>{t('cancel')}</Button>
                    <Button onClick={confirmDeleteEvent} variant="contained" color="primary">{t('delete')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default function Events({ user, onShowSnackbar }) {
    const { t } = useTranslation();
    const [events, setEvents] = useState([]);
    const [error, setError] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);

    const fetchEvents = useCallback(() => {
        console.log('fetchEvents called');
        if (!user || !user.id) {
            console.log('fetchEvents: user or user.id is missing', user);
            return;
        }
        axios.get(`/api/users/${user.id}/events`)
            .then(response => {
                console.log('fetchEvents: received data', response.data);
                setEvents(response.data);
            })
            .catch(err => {
                console.error('Failed to fetch events:', err);
                setError(t('fetch_events_failed'));
            });
    }, [user, t]);

    useEffect(() => {
        console.log('Events component useEffect triggered');
        fetchEvents();
    }, [fetchEvents]);

    const handleEventCreate = (newEvent) => {
        console.log('handleEventCreate: new event created', newEvent);
        setEvents(prevEvents => [...prevEvents, newEvent]);
    };

    const handleEventUpdated = (updatedEvent) => {
        setEvents(prevEvents => prevEvents.map(event => event.id === updatedEvent.id ? updatedEvent : event));
    };

    const handleEventDeleted = (deletedEventId) => {
        setEvents(prevEvents => prevEvents.filter(event => event.id !== deletedEventId));
    };

    if (selectedEvent) {
        return <EventDetailView user={user} event={selectedEvent} onBack={() => setSelectedEvent(null)} onEventUpdated={handleEventUpdated} onEventDeleted={handleEventDeleted} onShowSnackbar={onShowSnackbar} />;
    }

    return (
        <Box>
            <CreateEventForm onEventCreate={handleEventCreate} onShowSnackbar={onShowSnackbar} />
            {error && <Typography color="error">{error}</Typography>}
            <Stack spacing={2} sx={{ mt: 2 }}>
                {events.length > 0 ? (
                    events.map(event => (
                        <Paper key={event.id} elevation={1} sx={{ p: 2, cursor: 'pointer', bgcolor: 'background.paper' }} onClick={() => setSelectedEvent(event)}>
                            <Typography variant="h6">{event.title}</Typography>
                        </Paper>
                    ))
                ) : (
                    <Typography>{t('no_events')}</Typography>
                )}
            </Stack>
        </Box>
    );
}
