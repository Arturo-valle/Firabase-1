import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, Typography, CircularProgress, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const API_BASE_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

const IssuerList = () => {
    const [issuers, setIssuers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchIssuers = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/issuers`);
                // The API now returns { issuers: [...] }, so we access the nested array
                setIssuers(response.data.issuers || []);
                setError(null);
            } catch (err) {
                console.error("Error fetching issuers:", err);
                setError('Failed to load issuers. Please try again later.');
                setIssuers([]);
            } finally {
                setLoading(false);
            }
        };
        fetchIssuers();
    }, []);

    if (loading) {
        return <CircularProgress />;
    }

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    return (
        <div>
            {issuers.map((issuer) => (
                <Card key={issuer.id || issuer.name} sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography variant="h6">{issuer.name}</Typography>
                        <Chip label={issuer.sector} size="small" sx={{ mb: 1 }} />
                        {issuer.documents && issuer.documents.length > 0 && (
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography>View Documents ({issuer.documents.length})</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <List dense>
                                        {issuer.documents.map((doc, index) => (
                                            <ListItem key={index} component="a" href={doc.url} target="_blank" rel="noopener noreferrer">
                                                <ListItemText
                                                    primary={doc.title}
                                                    secondary={`Date: ${doc.date} | Type: ${doc.type}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </AccordionDetails>
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default IssuerList;
