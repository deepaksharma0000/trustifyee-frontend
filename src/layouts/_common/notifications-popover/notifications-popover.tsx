import { m } from 'framer-motion';
import { useState, useCallback, useEffect } from 'react';
// @mui
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
import { useResponsive } from 'src/hooks/use-responsive';
// components
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { varHover } from 'src/components/animate';
import { HOST_API } from 'src/config-global';
//
import NotificationItem from './notification-item';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'all',
    label: 'All',
    count: 0,
  },
  {
    value: 'unread',
    label: 'Unread',
    count: 0,
  },
];

// ----------------------------------------------------------------------

type Message = {
  _id: string;
  subject: string;
  message: string;
  target: string;
  created_at: string;
  isUnRead?: boolean;
};

export default function NotificationsPopover() {
  const drawer = useBoolean();
  const modal = useBoolean();
  const smUp = useResponsive('up', 'sm');
  const API_BASE = HOST_API || process.env.REACT_APP_API_BASE_URL || '';

  const [currentTab, setCurrentTab] = useState('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('authUser');
      if (!token || !userData) return;

      const parsed = JSON.parse(userData);
      if (parsed.role === 'admin') return; // Admin handles messages in Message Center

      const res = await fetch(`${API_BASE}/api/messages/user/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status) {
        const transformed = data.data.map((msg: Message) => ({
          id: msg._id,
          title: msg.subject,
          category: 'Message Center',
          createdAt: new Date(msg.created_at),
          isUnRead: true, // simplified for now as per requirement "remains today only"
          type: 'mail',
          avatarUrl: null,
          fullMessage: msg.message
        }));
        setNotifications(transformed);
      }
    } catch (err) {
      console.error("Fetch notifications error", err);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleChangeTab = useCallback((event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
  }, []);

  const totalUnRead = notifications.filter((item) => item.isUnRead === true).length;

  const handleMarkAllAsRead = () => {
    setNotifications(
      notifications.map((notification) => ({
        ...notification,
        isUnRead: false,
      }))
    );
  };

  const handleOpenMessage = (notification: any) => {
    setSelectedMessage({
      _id: notification.id,
      subject: notification.title,
      message: notification.fullMessage,
      target: '',
      created_at: notification.createdAt.toISOString()
    });
    modal.onTrue();
    // Mark as read locally
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isUnRead: false } : n));
  };

  const renderHead = (
    <Stack direction="row" alignItems="center" sx={{ py: 2, pl: 2.5, pr: 1, minHeight: 68 }}>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Notifications
      </Typography>

      {!!totalUnRead && (
        <Tooltip title="Mark all as read">
          <IconButton color="primary" onClick={handleMarkAllAsRead}>
            <Iconify icon="eva:done-all-fill" />
          </IconButton>
        </Tooltip>
      )}

      {!smUp && (
        <IconButton onClick={drawer.onFalse}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      )}
    </Stack>
  );

  const renderTabs = (
    <Tabs value={currentTab} onChange={handleChangeTab}>
      {TABS.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            <Label
              variant={((tab.value === 'all' || tab.value === currentTab) && 'filled') || 'soft'}
              color={
                (tab.value === 'unread' && 'info') ||
                'default'
              }
            >
              {tab.value === 'all' ? notifications.length : totalUnRead}
            </Label>
          }
          sx={{
            '&:not(:last-of-type)': {
              mr: 3,
            },
          }}
        />
      ))}
    </Tabs>
  );

  const renderList = (
    <Scrollbar>
      <List disablePadding>
        {notifications
          .filter(n => currentTab === 'all' || (currentTab === 'unread' && n.isUnRead))
          .map((notification) => (
            <Box key={notification.id} onClick={() => handleOpenMessage(notification)}>
              <NotificationItem notification={notification} />
            </Box>
          ))}
      </List>
    </Scrollbar>
  );

  return (
    <>
      <IconButton
        component={m.button}
        whileTap="tap"
        whileHover="hover"
        variants={varHover(1.05)}
        color={drawer.value ? 'primary' : 'default'}
        onClick={drawer.onTrue}
      >
        <Badge badgeContent={totalUnRead} color="error">
          <Iconify icon="solar:bell-bing-bold-duotone" width={24} />
        </Badge>
      </IconButton>

      <Drawer
        open={drawer.value}
        onClose={drawer.onFalse}
        anchor="right"
        slotProps={{
          backdrop: { invisible: true },
        }}
        PaperProps={{
          sx: { width: 1, maxWidth: 420 },
        }}
      >
        {renderHead}

        <Divider />

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ pl: 2.5, pr: 1 }}
        >
          {renderTabs}
        </Stack>

        <Divider />

        {renderList}

        <Box sx={{ p: 1 }}>
          <Button fullWidth size="large" onClick={fetchNotifications}>
            Refresh
          </Button>
        </Box>
      </Drawer>

      <Dialog open={modal.value} onClose={modal.onFalse} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Iconify icon="solar:letter-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
          {selectedMessage?.subject}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {selectedMessage?.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={modal.onFalse} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
