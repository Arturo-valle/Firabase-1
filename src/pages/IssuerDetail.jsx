
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, Typography, CircularProgress, List, ListItem, ListItemText, Breadcrumbs, Paper } from '@mui/material';

// IMPORTANT: Ensure this base URL is correct for your deployed functions
const API_BASE_URL = 'https://us-central1-mvp-nic-market.cloudfunctions.net/api';

const IssuerDetail = () => {
    // useParams gets the issuerName from the URL, make sure it's URL-decoded
    const { issuerName } = useParams();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDocuments = async () => {
            if (!issuerName) return;

            try {
                setLoading(true);
                setError(null);
                
                // Construct the correct API endpoint with the issuerName as a query parameter
                const response = await axios.get(`${API_BASE_URL}/issuer-documents`, {
                    params: { issuerName: decodeURIComponent(issuerName) }
                });
                
                setDocuments(response.data.documents || []);

            } catch (err) {
                console.error("Error fetching issuer documents:", err);
                // Provide a more descriptive error message, including the response from the server if available
                const apiError = err.response ? err.response.data : 'Network error or CORS issue.';
                setError(`Error al conectar con la API (${err.response ? err.response.status : 'N/A'}): ${JSON.stringify(apiError)}`);
                setDocuments([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, [issuerName]); // This effect runs whenever the issuerName from the URL changes

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link to="/">
                    Bóveda Inteligente
                </Link>
                <Typography color="text.primary">{decodeURIComponent(issuerName)}</Typography>
            </Breadcrumbs>
            
            <Typography variant="h5" gutterBottom>
                Documentos y Hechos Relevantes
            </Typography>

            {loading && <CircularProgress />}
            
            {error && (
                <Typography color="error" sx={{ mt: 2 }}>
                    {error}
                </Typography>
            )}

            {!loading && !error && documents.length === 0 && (
                <Typography sx={{ mt: 2 }}>
                    No se encontraron documentos para este emisor.
                </Typography>
            )}

            {!loading && !error && documents.length > 0 && (
                <List dense>
                    {documents.map((doc, index) => (
                        <ListItem key={index} component="a" href={doc.url} target="_blank" rel="noopener noreferrer" divider>
                            <ListItemText
                                primary={doc.title}
                                secondary={`Fecha: ${doc.date} | Tipo: ${doc.type}`}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Paper>
    );
};

export default IssuerDetail;
