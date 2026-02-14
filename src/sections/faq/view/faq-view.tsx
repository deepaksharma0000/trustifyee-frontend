import { useState } from 'react';
// @mui
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
// components
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

const CATEGORIES = [
    'All FAQs',
    'Software FAQs',
    'MT-4 FAQs',
    'APIs Login With Broker FAQs',
    'Trade Issue FAQs',
];

const FAQS = [
    {
        id: '1',
        question: 'How to install the Trustify software?',
        answer: 'Download the installer from the dashboard, run setup.exe, and follow the on-screen instructions.',
        category: 'Software FAQs',
    },
    {
        id: '2',
        question: 'How to connect MT-4?',
        answer: 'Go to Settings > MT-4 Configuration, enter your account details, and click Connect.',
        category: 'MT-4 FAQs',
    },
    {
        id: '3',
        question: 'How to generate Broker API keys?',
        answer: 'Login to your broker portal, navigate to API settings, and create a new App to get API Key and Secret.',
        category: 'APIs Login With Broker FAQs',
    },
    {
        id: '4',
        question: 'Why was my order rejected?',
        answer: 'Common reasons include insufficient funds, market closed, or invalid strike price.',
        category: 'Trade Issue FAQs',
    },
    {
        id: '5',
        question: 'How to update standard settings?',
        answer: 'Navigate to standard settings from the main menu and update your preferences.',
        category: 'Software FAQs',
    },
];

export default function FaqView() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All FAQs');

    const filteredFaqs = FAQS.filter((faq) => {
        const matchesCategory = selectedCategory === 'All FAQs' || faq.category === selectedCategory;
        const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" sx={{ mb: 5 }}>
                Frequently Asked Questions
            </Typography>

            <Card sx={{ p: 3, mb: 5 }}>
                <Stack spacing={2}>
                    <TextField
                        fullWidth
                        placeholder="Search FAQ..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <Box display="flex" gap={1} flexWrap="wrap">
                        <Typography variant="subtitle2" sx={{ mr: 1, my: 'auto' }}>
                            Filter By:
                        </Typography>
                        {CATEGORIES.map((category) => (
                            <Chip
                                key={category}
                                label={category}
                                color={selectedCategory === category ? 'primary' : 'default'}
                                onClick={() => setSelectedCategory(category)}
                                variant={selectedCategory === category ? 'filled' : 'outlined'}
                                clickable
                            />
                        ))}
                    </Box>
                </Stack>
            </Card>

            <Box>
                {filteredFaqs.map((faq) => (
                    <Accordion key={faq.id}>
                        <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
                            <Typography variant="subtitle1">{faq.question}</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>{faq.answer}</Typography>
                            <Chip size="small" label={faq.category} sx={{ mt: 2 }} />
                        </AccordionDetails>
                    </Accordion>
                ))}
                {filteredFaqs.length === 0 && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h6" color="text.secondary">No FAQs found matching your criteria.</Typography>
                    </Box>
                )}
            </Box>
        </Container>
    );
}
