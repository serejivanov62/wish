import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

// MUI Imports
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';

import Items from './components/Items';
import Events from './components/Events';
import Friends from './components/Friends';
import './App.css'; // Keep for custom overrides if any

const tg = window.Telegram.WebApp;

// --- Mock Data for Local Development ---
const dev_user_data_1 = {
  id: 999999999,
  first_name: 'Dev',
  last_name: 'User 1',
  username: 'dev_user_1',
  language_code: 'en',
  phone: '+9999999990',
  avatar_url: 'https://i.pravatar.cc/150?img=1' // Example avatar
};

const dev_user_data_2 = {
  id: 888888888,
  first_name: 'Test',
  last_name: 'User 2',
  username: 'test_user_2',
  language_code: 'en',
  phone: '+8888888880',
  avatar_url: 'https://i.pravatar.cc/150?img=2' // Example avatar
};

const isDevEnv = !tg.initDataUnsafe?.user;

// --- Custom MUI Theme (inspired by reference image) ---
const theme = createTheme({
  palette: {
    primary: {
      main: '#FF6B6B', // Soft coral/orange from reference
      contrastText: '#fff',
    },
    secondary: {
      main: '#4ECDC4', // Teal accent
      contrastText: '#fff',
    },
    background: {
      default: '#F0F2F5', // Very light grey background, slightly darker than cards
      paper: '#FFFFFF', // White for cards
    },
    text: {
      primary: '#333333',
      secondary: '#555555',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif', // Modern sans-serif font
    h1: {
      fontSize: '2.2rem',
      fontWeight: 700,
      color: '#333333',
    },
    h2: {
      fontSize: '1.8rem',
      fontWeight: 600,
      color: '#333333',
    },
    h3: {
      fontSize: '1.4rem',
      fontWeight: 500,
      color: '#333333',
    },
    h4: {
      fontSize: '1.2rem',
      fontWeight: 500,
      color: '#333333',
    },
    body1: {
      fontSize: '1rem',
      color: '#555555',
    },
    body2: {
      fontSize: '0.875rem',
      color: '#777777',
    },
  },
  shape: {
    borderRadius: 16, // More rounded corners for all components
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Rounded buttons
          textTransform: 'none',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)', // Subtle shadow
          '&:hover': {
            boxShadow: '0 6px 12px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0, // Default to no elevation for a flatter look
      },
      styleOverrides: {
        root: {
          borderRadius: 16, // Rounded cards
          padding: '20px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)', // Subtle shadow
          border: '1px solid #E0E0E0', // Light border
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid #E0E0E0',
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          justifyContent: 'space-between',
        },
      },
    },
  },
});

// --- FriendWishlistView Component ---
function FriendWishlistView({ user, friend, onBack, onShowSnackbar }) {
    const { t } = useTranslation();
    const [events, setEvents] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get(`/api/users/${friend.id}/events`)
            .then(response => {
                setEvents(response.data);
            })
            .catch(err => {
                console.error('Failed to fetch friend events:', err);
                setError(t('fetch_events_failed'));
            });
    }, [friend.id, t]);

    const handleBookItem = (itemId) => {
        axios.post(`/api/items/${itemId}/book`)
            .then(() => {
                onShowSnackbar(t('gift_booked_success'), 'success');
                // Ideally, refetch events or update state to show item as booked
            })
            .catch(err => {
                console.error('Failed to book item', err);
                onShowSnackbar(err.response?.data?.detail || t('book_item_failed'), 'error');
            });
    };

    return (
        <Box> {/* Added this wrapping Box */}
            <Button variant="outlined" onClick={onBack} startIcon={<Box component="span" sx={{ transform: 'rotate(180deg)' }}>&#10140;</Box>}>
                {t('back_to_friends')}
            </Button>
            <Typography variant="h3" sx={{ mt: 2, mb: 3 }}>{t('friend_wishlists', { name: friend.name })}</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack spacing={2}>
            {events.length > 0 ? (
                events.map(event => (
                    <Paper key={event.id} sx={{ p: 3, mb: 2 }}>
                        <Typography variant="h4" gutterBottom>{event.title}</Typography>
                        <Stack spacing={1}>
                        {event.items.map(item => (
                            <Paper key={item.id} elevation={0} sx={{ p: 2, bgcolor: 'background.default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="body1">{item.title} - ${item.price}</Typography>
                                    {item.link && <Typography variant="body2" color="primary"><a href={item.link} target="_blank" rel="noopener noreferrer">{t('link')}</a></Typography>}
                                </Box>
                                <Button variant="contained" color="secondary" onClick={() => handleBookItem(item.id)} disabled={item.is_booked}>
                                    {t(item.is_booked ? 'booked' : 'book_gift')}
                                </Button>
                            </Paper>
                        ))}
                        </Stack>
                    </Paper>
                ))
            ) : (
                <Typography>{t('no_public_wishlists')}</Typography>
            )}
            </Stack>
        </Box> 
    );
}


// --- App Component ---
function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [view, setView] = useState('items');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [error, setError] = useState('');
  const [currentMockUser, setCurrentMockUser] = useState(dev_user_data_1);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [manualPhone, setManualPhone] = useState('');

  const handleShowSnackbar = useCallback((message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  // Axios Interceptor to add Authorization header
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      config => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );
    return () => { // Cleanup interceptor on component unmount
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  const handleSharePhoneNumber = () => {
    console.log('handleSharePhoneNumber called');
    console.log('tg object:', tg);
    console.log('tg.requestContact available:', !!(tg && tg.requestContact));
    if (tg && tg.requestContact) {
      console.log('tg.requestContact is available, requesting contact...');
      // This will trigger the Telegram prompt. The actual phone number will be received via the web_app_data_updated event.
      tg.requestContact();
      // We don't handle the response here directly, as it's handled by the event listener.
      // We can show a temporary message or just wait for the event.
      handleShowSnackbar(t('phone_number_request_sent'), 'info');
    } else {
      console.log('tg or tg.requestContact not available, showing manual input dialog...');
      setShowPhoneDialog(true);
    }
  };

  const handleManualPhoneSubmit = () => {
    if (!manualPhone || manualPhone.trim() === '') {
      handleShowSnackbar(t('phone_number_required'), 'error');
      return;
    }

    // Normalize phone number
    const normalizePhone = (phoneNum) => {
      let normalized = phoneNum.replace(/[^\d+]/g, '');
      if (!normalized.startsWith('+')) {
        normalized = '+' + normalized;
      }
      return normalized;
    };

    const normalizedPhone = normalizePhone(manualPhone);
    
    axios.put('/api/users/me/phone', { phone: normalizedPhone })
      .then(response => {
        setUser(response.data);
        setShowPhoneDialog(false);
        setManualPhone('');
        handleShowSnackbar(t('phone_number_updated_success'), 'success');
      })
      .catch(error => {
        console.error('Failed to update phone number manually:', error);
        handleShowSnackbar(t('phone_number_update_failed'), 'error');
      });
  };

  // ... existing useEffect ...

  useEffect(() => {
    tg.ready();
    
    const telegramUser = isDevEnv ? currentMockUser : tg.initDataUnsafe.user;

    if (telegramUser) {
        const authPayload = {
            init_data: isDevEnv ? `dev_user_id=${telegramUser.id}` : tg.initData,
        };

        axios.post('/api/auth/telegram', authPayload)
            .then(response => {
                localStorage.setItem('access_token', response.data.access_token);
                // Now fetch user details using the new token
                axios.get('/api/users/me')
                    .then(userResponse => {
                        setUser(userResponse.data);
                        console.log('User data after fetch:', userResponse.data);
                        console.log('User phone:', userResponse.data.phone);
                    })
                    .catch(userErr => {
                        console.error('Failed to fetch user details:', userErr.response?.data);
                        setError(t('auth_failed'));
                    });
            })
            .catch(err => {
                console.error('Authentication failed:', err);
                setError(t('auth_failed'));
            });
    } else {
        setError(t('auth_failed'));
    }
  }, [currentMockUser, t, handleShowSnackbar]); // Added handleShowSnackbar to dependencies

  // Effect to listen for web_app_data_updated event
  useEffect(() => {
    if (!tg) return;

    const handleWebAppUpdate = () => {
      console.log('web_app_data_updated event received');
      const phoneNumber = tg.initDataUnsafe?.user?.phone_number;
      if (phoneNumber) {
        console.log('Phone number found in initDataUnsafe:', phoneNumber);
        axios.put('/api/users/me/phone', { phone: phoneNumber })
          .then(response => {
            setUser(response.data);
            handleShowSnackbar(t('phone_number_updated_success'), 'success');
          })
          .catch(error => {
            console.error('Failed to update phone number from web_app_data_updated:', error);
            handleShowSnackbar(t('phone_number_update_failed'), 'error');
          });
      } else {
        console.log('Phone number not found in initDataUnsafe after update.');
      }
    };

    tg.onEvent('web_app_data_updated', handleWebAppUpdate);

    return () => {
      tg.offEvent('web_app_data_updated', handleWebAppUpdate);
    };
  }, [t, handleShowSnackbar]); // Dependencies for this useEffect

  const handleViewFriendWishes = (friend) => {
    setSelectedFriend(friend);
    setView('friend_wishes');
  }

  const renderView = () => {
    if (!user) return <Typography>{t('loading')}</Typography>;

    switch (view) {
      case 'items':
        return <Items user={user} onShowSnackbar={handleShowSnackbar} />;
      case 'events':
        return <Events user={user} onShowSnackbar={handleShowSnackbar} />;
      case 'friends':
        return <Friends user={user} onViewFriendWishes={handleViewFriendWishes} onShowSnackbar={handleShowSnackbar} />;
      case 'friend_wishes':
        return <FriendWishlistView user={user} friend={selectedFriend} onBack={() => setView('friends')} onShowSnackbar={handleShowSnackbar} />;
      default:
        return <Items user={user} />;
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #E0E0E0' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
              {t('welcome_message')}
            </Typography>
            {/* Top right icons/profile from reference image could go here */}
          </Toolbar>
        </AppBar>
        <Container maxWidth="sm" sx={{ mt: 4, flexGrow: 1 }}> {/* Changed to sm for single column focus */}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {user ? (
            <Stack spacing={3}> {/* Use Stack for vertical spacing of cards */}
              {/* Profile Card */}
              <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Avatar alt={user.name} src={user.avatar_url} sx={{ width: 80, height: 80, mb: 2 }} />
                <Typography variant="h4" gutterBottom>{t('welcome_user', { name: user.name || user.first_name })}</Typography>
                
                {/* Phone Number Prompt */}
                {(!user.phone || user.phone === '') && (
                  <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {t('phone_number_required_message', 'Please share your phone number to let friends find you')}
                    </Alert>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleSharePhoneNumber}
                      >
                        {t('share_phone_number', 'Share Phone Number')}
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        onClick={() => setShowPhoneDialog(true)}
                      >
                        {t('enter_manually', 'Enter Manually')}
                      </Button>
                    </Stack>
                  </Box>
                )}
                
                {user.phone && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('phone_number', 'Phone')}: {user.phone}
                  </Typography>
                )}
                
                {isDevEnv && (
                    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
                        <Button variant="outlined" size="small" onClick={() => setCurrentMockUser(dev_user_data_1)}>User 1</Button>
                        <Button variant="outlined" size="small" onClick={() => setCurrentMockUser(dev_user_data_2)}>User 2</Button>
                    </Stack>
                )}
                {/* Placeholder for activity/progress from reference */}
                <Typography variant="h6" sx={{ mt: 2 }}>78%</Typography>
                <Typography variant="body2" color="text.secondary">Total month activity</Typography>
              </Paper>

              {/* Navigation Tabs */}
              {view !== 'friend_wishes' && (
                  <Paper sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1} justifyContent="space-around">
                          <Button variant={view === 'items' ? "contained" : "text"} onClick={() => setView('items')}>{t('my_wishes')}</Button>
                          <Button variant={view === 'events' ? "contained" : "text"} onClick={() => setView('events')}>{t('my_events')}</Button>
                          <Button variant={view === 'friends' ? "contained" : "text"} onClick={() => setView('friends')}>{t('friends')}</Button>
                      </Stack>
                  </Paper>
              )}

              {/* Rendered View Content */}
              <Paper sx={{ p: 3 }}> {/* Wrap content in a Paper card */}
                {renderView()}
              </Paper>
            </Stack>
          ) : (
            <Typography>{t('authenticating')}</Typography>
          )}
        </Container>
      </Box>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={() => setSnackbarOpen(false)}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Manual Phone Number Dialog */}
      <Dialog open={showPhoneDialog} onClose={() => setShowPhoneDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('enter_phone_number', 'Enter Your Phone Number')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('phone_number_help', 'Enter your phone number with country code (e.g., +1234567890)')}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label={t('phone_number', 'Phone Number')}
            type="tel"
            fullWidth
            variant="outlined"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            placeholder="+1234567890"
            helperText={t('phone_format_help', 'Format: +[country code][number]')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPhoneDialog(false)}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleManualPhoneSubmit} variant="contained">
            {t('save', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}



export default App;