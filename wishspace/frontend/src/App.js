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

// --- Custom MUI Theme - Modern and Clean ---
const theme = createTheme({
  palette: {
    primary: {
      main: '#6366F1', // Modern indigo
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#fff',
    },
    secondary: {
      main: '#EC4899', // Modern pink
      light: '#F472B6',
      dark: '#DB2777',
      contrastText: '#fff',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    background: {
      default: '#F8FAFC', // Very light grey-blue
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
      disabled: '#94A3B8',
    },
    grey: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.015em',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.015em',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 40,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 1,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          '&.MuiPaper-elevation0': {
            boxShadow: 'none',
          },
          '&.MuiPaper-elevation1': {
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            fontSize: '0.875rem',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6366F1',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6366F1',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          borderBottom: 'none',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
        <Box>
            {/* Header with back button */}
            <Box sx={{ mb: 3 }}>
                <Button 
                    variant="outlined" 
                    onClick={onBack} 
                    startIcon={<span>←</span>}
                    sx={{ mb: 2 }}
                >
                    {t('back_to_friends', 'Back to Friends')}
                </Button>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    🎁 {friend.name}'s Wishlists
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {t('browse_friend_wishes', 'Browse and book gifts for your friend')}
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            <Stack spacing={3}>
                {events.length > 0 ? (
                    events.map(event => (
                        <Paper key={event.id} elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200' }}>
                            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                                🎉 {event.title}
                            </Typography>
                            <Stack spacing={2}>
                                {event.items.map(item => (
                                    <Paper 
                                        key={item.id} 
                                        elevation={0} 
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: 'grey.50',
                                            border: '1px solid',
                                            borderColor: 'grey.200',
                                            borderRadius: 2,
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            flexDirection: { xs: 'column', sm: 'row' },
                                            gap: 2
                                        }}
                                    >
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                                                {item.title}
                                            </Typography>
                                            {item.price > 0 && (
                                                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                                    ${item.price}
                                                </Typography>
                                            )}
                                            {item.link && (
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    <a 
                                                        href={item.link} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        style={{ 
                                                            color: '#6366F1', 
                                                            textDecoration: 'none',
                                                            fontSize: '0.875rem'
                                                        }}
                                                    >
                                                        🔗 {t('view_product', 'View Product')}
                                                    </a>
                                                </Typography>
                                            )}
                                        </Box>
                                        <Button 
                                            variant={item.is_booked ? "outlined" : "contained"}
                                            color={item.is_booked ? "success" : "primary"}
                                            onClick={() => handleBookItem(item.id)} 
                                            disabled={item.is_booked}
                                            sx={{ minWidth: 120 }}
                                        >
                                            {item.is_booked ? '✅ Booked' : '📦 Book Gift'}
                                        </Button>
                                    </Paper>
                                ))}
                            </Stack>
                        </Paper>
                    ))
                ) : (
                    <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'grey.200' }}>
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                            📭 {t('no_public_wishlists', 'No public wishlists yet')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('friend_no_events', 'Your friend hasn\'t created any public events yet')}
                        </Typography>
                    </Paper>
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
      
      // Правильный способ использования requestContact с callback
      tg.requestContact((success, response) => {
        console.log('requestContact callback - success:', success, 'response:', response);
        
        if (success && response && response.contact && response.contact.phoneNumber) {
          const phoneNumber = response.contact.phoneNumber;
          console.log('Phone number received:', phoneNumber);
          
          // Нормализация номера
          const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
          
          // Сохранение номера
          axios.put('/api/users/me/phone', { phone: normalizedPhone })
            .then(res => {
              setUser(res.data);
              handleShowSnackbar(t('phone_number_updated_success'), 'success');
            })
            .catch(error => {
              console.error('Failed to update phone number:', error);
              handleShowSnackbar(t('phone_number_update_failed'), 'error');
            });
        } else {
          console.log('User declined to share phone number or no phone number received');
          handleShowSnackbar(t('phone_sharing_declined', 'Phone sharing was declined. Please try manual entry.'), 'info');
          setShowPhoneDialog(true);
        }
      });
      
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

  // Check if phone number is already available in initData
  useEffect(() => {
    if (!tg || !tg.initDataUnsafe) return;

    const phoneNumber = tg.initDataUnsafe?.user?.phone_number;
    if (phoneNumber && user && (!user.phone || user.phone === '')) {
      console.log('Phone number found in initDataUnsafe:', phoneNumber);
      const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
      
      axios.put('/api/users/me/phone', { phone: normalizedPhone })
        .then(response => {
          setUser(response.data);
          console.log('Phone number auto-updated from initData');
        })
        .catch(error => {
          console.error('Failed to auto-update phone number:', error);
        });
    }
  }, [user, t]); // Run when user data changes

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
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh', 
        bgcolor: 'background.default' 
      }}>
        {/* Header */}
        <AppBar position="static" elevation={0}>
          <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                color: 'text.primary',
                fontWeight: 600,
                letterSpacing: '-0.01em'
              }}
            >
              WishSpace
            </Typography>
            {user && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar 
                  alt={user.name} 
                  src={user.avatar_url} 
                  sx={{ width: 32, height: 32 }}
                />
              </Box>
            )}
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container 
          maxWidth="md" 
          sx={{ 
            flexGrow: 1, 
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 3 }
          }}
        >
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}
          
          {user ? (
            <Box>
              {/* Profile Section */}
              <Paper 
                elevation={0}
                sx={{ 
                  p: { xs: 3, sm: 4 }, 
                  mb: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    transform: 'translate(30px, -30px)',
                  }
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'center', sm: 'flex-start' },
                  gap: 3,
                  position: 'relative',
                  zIndex: 1
                }}>
                  <Avatar 
                    alt={user.name} 
                    src={user.avatar_url} 
                    sx={{ 
                      width: { xs: 80, sm: 96 }, 
                      height: { xs: 80, sm: 96 },
                      border: '4px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
                    }} 
                  />
                  <Box sx={{ 
                    textAlign: { xs: 'center', sm: 'left' },
                    flex: 1
                  }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700,
                        mb: 1,
                        color: 'white'
                      }}
                    >
                      {user.name || user.first_name || 'Welcome'}
                    </Typography>
                    {user.phone && (
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          opacity: 0.9,
                          mb: 1
                        }}
                      >
                        📱 {user.phone}
                      </Typography>
                    )}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.8
                      }}
                    >
                      {t('profile_subtitle', 'Manage your wishes and connect with friends')}
                    </Typography>
                  </Box>
                </Box>

                {/* Phone Number Setup */}
                {(!user.phone || user.phone === '') && (
                  <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <Alert 
                      severity="info" 
                      sx={{ 
                        mb: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        '& .MuiAlert-icon': {
                          color: 'white'
                        }
                      }}
                    >
                      {t('phone_number_required_message', 'Please share your phone number to let friends find you')}
                    </Alert>
                    <Stack 
                      direction={{ xs: 'column', sm: 'row' }} 
                      spacing={2} 
                      sx={{ mt: 2 }}
                    >
                      <Button 
                        variant="contained" 
                        onClick={handleSharePhoneNumber}
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.3)',
                          }
                        }}
                      >
                        {t('share_phone_number', 'Share Phone Number')}
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={() => setShowPhoneDialog(true)}
                        sx={{
                          color: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                          '&:hover': {
                            borderColor: 'white',
                            bgcolor: 'rgba(255, 255, 255, 0.1)'
                          }
                        }}
                      >
                        {t('enter_manually', 'Enter Manually')}
                      </Button>
                    </Stack>
                  </Box>
                )}

                {/* Dev Environment Controls */}
                {isDevEnv && (
                  <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                      Development Mode
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => setCurrentMockUser(dev_user_data_1)}
                        sx={{ 
                          color: 'white', 
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          fontSize: '0.75rem'
                        }}
                      >
                        User 1
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => setCurrentMockUser(dev_user_data_2)}
                        sx={{ 
                          color: 'white', 
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          fontSize: '0.75rem'
                        }}
                      >
                        User 2
                      </Button>
                    </Stack>
                  </Box>
                )}
              </Paper>

              {/* Navigation */}
              {view !== 'friend_wishes' && (
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 1, 
                    mb: 3,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Stack 
                    direction="row" 
                    spacing={1} 
                    sx={{ 
                      justifyContent: 'center',
                      flexWrap: 'wrap',
                      gap: 1
                    }}
                  >
                    <Button 
                      variant={view === 'items' ? "contained" : "text"}
                      onClick={() => setView('items')}
                      sx={{ 
                        minWidth: { xs: 'auto', sm: 120 },
                        flex: { xs: 1, sm: 'none' }
                      }}
                    >
                      🎁 {t('my_wishes', 'My Wishes')}
                    </Button>
                    <Button 
                      variant={view === 'events' ? "contained" : "text"}
                      onClick={() => setView('events')}
                      sx={{ 
                        minWidth: { xs: 'auto', sm: 120 },
                        flex: { xs: 1, sm: 'none' }
                      }}
                    >
                      🎉 {t('my_events', 'Events')}
                    </Button>
                    <Button 
                      variant={view === 'friends' ? "contained" : "text"}
                      onClick={() => setView('friends')}
                      sx={{ 
                        minWidth: { xs: 'auto', sm: 120 },
                        flex: { xs: 1, sm: 'none' }
                      }}
                    >
                      👥 {t('friends', 'Friends')}
                    </Button>
                  </Stack>
                </Paper>
              )}

              {/* Content Area */}
              <Paper 
                elevation={0}
                sx={{ 
                  p: { xs: 2, sm: 3 },
                  minHeight: 400,
                  bgcolor: 'background.paper'
                }}
              >
                {renderView()}
              </Paper>
            </Box>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '60vh' 
            }}>
              <Typography variant="h6" color="text.secondary">
                {t('authenticating', 'Authenticating...')}
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity} 
          sx={{ 
            width: '100%',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            '& .MuiAlert-icon': {
              fontSize: '1.25rem'
            },
            '& .MuiAlert-message': {
              fontSize: '0.875rem',
              fontWeight: 500
            }
          }}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Manual Phone Number Dialog */}
      <Dialog 
        open={showPhoneDialog} 
        onClose={() => setShowPhoneDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center',
          pb: 1,
          fontWeight: 600
        }}>
          📱 {t('enter_phone_number', 'Enter Your Phone Number')}
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2 }}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mb: 3, textAlign: 'center' }}
          >
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
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1rem',
                fontWeight: 500
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button 
            onClick={() => setShowPhoneDialog(false)}
            variant="outlined"
            sx={{ minWidth: 100 }}
          >
            {t('cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleManualPhoneSubmit} 
            variant="contained"
            sx={{ minWidth: 100 }}
          >
            {t('save', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}



export default App;