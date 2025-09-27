import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

// MUI Imports
import { Button, TextField, Typography, Box, Paper, Stack, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Helper function for URL validation
const validateLink = (url) => {
  // Basic URL validation regex
  const urlRegex = /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/i;
  return url === '' || urlRegex.test(url);
};

function AddItemForm({ onAddItem, onShowSnackbar }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [price, setPrice] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [linkError, setLinkError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    let isValid = true;

    if (title.trim().length < 1 || title.trim().length > 255) {
      setTitleError(true);
      isValid = false;
    } else {
      setTitleError(false);
    }

    if (link && !validateLink(link)) {
      setLinkError(true);
      isValid = false;
    } else {
      setLinkError(false);
    }

    if (!isValid) {
      onShowSnackbar(t('validation_error'), 'error');
      return;
    }

    const newItem = {
      title,
      link: link || null,
      price: parseFloat(price) || 0,
      category_name: 'General'
    };
    axios.post(`/api/items/manual`, newItem)
      .then(response => {
        onAddItem(response.data);
        setTitle('');
        setLink('');
        setPrice('');
        onShowSnackbar(t('item_added_success'), 'success');
      })
      .catch(err => {
        console.error('Failed to add item', err);
        onShowSnackbar(err.response?.data?.detail || t('item_add_failed'), 'error');
      });
  };

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
      <Typography variant="h5" gutterBottom>{t('add_new_wish')}</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label={t('title_required')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          fullWidth
          error={titleError}
          helperText={titleError && t('title_validation_error')}
        />
        <TextField
          label={t('link')}
          value={link}
          onChange={e => setLink(e.target.value)}
          fullWidth
          error={linkError}
          helperText={linkError && t('link_validation_error')}
        />
        <TextField
          label={t('price')}
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          fullWidth
        />
        <Button type="submit" variant="contained" color="primary">
          {t('add_wish')}
        </Button>
      </Box>
    </Paper>
  );
}

export default function Items({ user, onShowSnackbar }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchItems = useCallback(() => {
    if (!user) return;
    axios.get(`/api/items`)
      .then(response => {
        setItems(response.data);
      })
      .catch(err => {
        console.error('Failed to fetch items:', err);
        setError(t('fetch_items_failed'));
      });
  }, [user, t]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddItem = (newItem) => {
    setItems(prevItems => [...prevItems, newItem]);
  };

  const handleEditClick = (item) => {
    setCurrentItem(item);
    setOpenEditDialog(true);
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setOpenDeleteConfirm(true);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      axios.delete(`/api/items/${itemToDelete.id}`)
        .then(() => {
          setItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
          setOpenDeleteConfirm(false);
          setItemToDelete(null);
          onShowSnackbar(t('item_deleted_success'), 'success');
        })
        .catch(err => {
          console.error('Failed to delete item', err);
          onShowSnackbar(t('item_delete_failed'), 'error');
        });
    }
  };

  const handleSaveEdit = (editedItem) => {
    // Basic frontend validation for edited item
    let isValid = true;
    if (editedItem.title.trim().length < 1 || editedItem.title.trim().length > 255) {
      onShowSnackbar(t('title_validation_error'), 'error');
      isValid = false;
    }
    if (editedItem.link && !validateLink(editedItem.link)) {
      onShowSnackbar(t('link_validation_error'), 'error');
      isValid = false;
    }
    if (!isValid) return;

    axios.put(`/api/items/${editedItem.id}`, editedItem)
      .then(response => {
        setItems(prevItems => prevItems.map(item => item.id === editedItem.id ? response.data : item));
        setOpenEditDialog(false);
        onShowSnackbar(t('item_updated_success'), 'success');
      })
      .catch(err => {
        console.error('Failed to update item', err);
        onShowSnackbar(t('item_update_failed'), 'error');
      });
  };

  return (
    <Box>
      <AddItemForm onAddItem={handleAddItem} onShowSnackbar={onShowSnackbar} />
      {error && <Typography color="error">{error}</Typography>}
      <Stack spacing={2} sx={{ mt: 2 }}>
        {items.length > 0 ? (
          items.map(item => (
            <Paper key={item.id} elevation={1} sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6">{item.title}</Typography>
                  {item.description && <Typography variant="body2">{item.description}</Typography>}
                  {item.link && <Typography variant="body2" color="primary"><a href={item.link} target="_blank" rel="noopener noreferrer">{t('link')}</a></Typography>}
                  <Typography variant="body2">{t('price')}: ${item.price}</Typography>
                </Box>
                <Box>
                  <IconButton onClick={() => handleEditClick(item)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteClick(item)} color="secondary">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))
        ) : (
          <Typography>{t('no_wishes')}</Typography>
        )}
      </Stack>

      {/* Edit Item Dialog */}
      {currentItem && (
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
          <DialogTitle>{t('edit_wish')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('title_required')}
                value={currentItem.title}
                onChange={e => setCurrentItem({ ...currentItem, title: e.target.value })}
                fullWidth
                error={currentItem.title.trim().length < 1 || currentItem.title.trim().length > 255}
                helperText={(currentItem.title.trim().length < 1 || currentItem.title.trim().length > 255) && t('title_validation_error')}
              />
              <TextField
                label={t('link')}
                value={currentItem.link}
                onChange={e => setCurrentItem({ ...currentItem, link: e.target.value })}
                fullWidth
                error={currentItem.link && !validateLink(currentItem.link)}
                helperText={currentItem.link && !validateLink(currentItem.link) && t('link_validation_error')}
              />
              <TextField
                label={t('price')}
                type="number"
                value={currentItem.price}
                onChange={e => setCurrentItem({ ...currentItem, price: parseFloat(e.target.value) || 0 })}
                fullWidth
              />
              <TextField
                label={t('description')}
                value={currentItem.description}
                onChange={e => setCurrentItem({ ...currentItem, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                inputProps={{ maxLength: 1000 }}
                error={currentItem.description && currentItem.description.length > 1000}
                helperText={currentItem.description && currentItem.description.length > 1000 && t('description_validation_error')}
              />
              <TextField
                label={t('note')}
                value={currentItem.note}
                onChange={e => setCurrentItem({ ...currentItem, note: e.target.value })}
                fullWidth
                multiline
                rows={2}
                inputProps={{ maxLength: 500 }}
                error={currentItem.note && currentItem.note.length > 500}
                helperText={currentItem.note && currentItem.note.length > 500 && t('note_validation_error')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>{t('cancel')}</Button>
            <Button onClick={() => handleSaveEdit(currentItem)} variant="contained" color="primary">{t('save')}</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Item Confirmation Dialog */}
      <Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)}>
        <DialogTitle>{t('confirm_delete_item_title')}</DialogTitle>
        <DialogContent>
          <Typography>{t('confirm_delete_item_message', { title: itemToDelete?.title })}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteConfirm(false)}>{t('cancel')}</Button>
          <Button onClick={confirmDeleteItem} variant="contained" color="primary">{t('delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}