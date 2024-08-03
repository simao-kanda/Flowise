import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import ReactJson from 'flowise-react-json-view'
import { cloneDeep } from 'lodash'
import { v4 as uuidv4 } from 'uuid'

// material-ui
import { Box, Card, Grid, Stack, Typography, OutlinedInput, IconButton } from '@mui/material'
import { useTheme, styled } from '@mui/material/styles'
import CardContent from '@mui/material/CardContent'
import chunks_emptySVG from '@/assets/images/chunks_empty.svg'
import { IconSearch, IconFileStack } from '@tabler/icons-react'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ExpandedChunkDialog from './ExpandedChunkDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { initNode } from '@/utils/genericHelper'

// API
import documentsApi from '@/api/documentstore'
import nodesApi from '@/api/nodes'

// Hooks
import useApi from '@/hooks/useApi'
import useNotifier from '@/utils/useNotifier'
import Embeddings from '@mui/icons-material/DynamicFeed'
import { baseURL } from '@/store/constant'
import DocStoreInputHandler from '@/views/docstore/DocStoreInputHandler'

const searchOptions = [
    {
        label: 'Similarity',
        name: 'similarity'
    },
    {
        label: 'Max Marginal Relevance',
        name: 'mmr'
    }
]

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    color: theme.darkTextPrimary,
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    cursor: 'pointer',
    '&:hover': {
        background: theme.palette.card.hover,
        boxShadow: '0 2px 14px 0 rgb(32 40 45 / 20%)'
    },
    maxHeight: '250px',
    minHeight: '250px',
    maxWidth: '100%',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-line',
    padding: 1
}))

const VectorStoreQuery = () => {
    const customization = useSelector((state) => state.customization)
    const navigate = useNavigate()
    const theme = useTheme()

    useNotifier()

    const URLpath = document.location.pathname.toString().split('/')
    const storeId = URLpath[URLpath.length - 1] === 'document-stores' ? '' : URLpath[URLpath.length - 1]

    const [documentChunks, setDocumentChunks] = useState([])
    const [loading, setLoading] = useState(false)
    const [showExpandedChunkDialog, setShowExpandedChunkDialog] = useState(false)
    const [expandedChunkDialogProps, setExpandedChunkDialogProps] = useState({})
    const [documentStore, setDocumentStore] = useState({})
    const [query, setQuery] = useState('')

    const [timeTaken, setTimeTaken] = useState(-1)
    const [retrievalError, setRetrievalError] = useState(undefined)

    const getSpecificDocumentStoreApi = useApi(documentsApi.getSpecificDocumentStore)
    const queryVectorStoreApi = useApi(documentsApi.queryVectorStore)

    const getVectorStoreNodeDetailsApi = useApi(nodesApi.getSpecificNode)
    const [selectedVectorStoreProvider, setSelectedVectorStoreProvider] = useState({})

    const chunkSelected = (chunkId, selectedChunkNumber) => {
        const selectedChunk = documentChunks.find((chunk) => chunk.id === chunkId)
        const dialogProps = {
            data: {
                selectedChunk,
                selectedChunkNumber
            }
        }
        setExpandedChunkDialogProps(dialogProps)
        setShowExpandedChunkDialog(true)
    }

    const doQuery = () => {
        setLoading(true)
        const data = {
            query: query,
            storeId: storeId,
            inputs: selectedVectorStoreProvider.inputs
        }
        queryVectorStoreApi.request(data)
    }

    useEffect(() => {
        if (queryVectorStoreApi.data) {
            setDocumentChunks(queryVectorStoreApi.data.docs)
            setTimeTaken(queryVectorStoreApi.data.timeTaken)
            setRetrievalError(undefined)
            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryVectorStoreApi.data])

    useEffect(() => {
        if (queryVectorStoreApi.error) {
            if (queryVectorStoreApi.error.response?.data?.message) {
                const message = queryVectorStoreApi.error.response.data.message
                // remove the text 'documentStoreServices.queryVectorStore - ' from the error message to make it readable
                setRetrievalError(message.replace('documentStoreServices.queryVectorStore - ', ''))
                setDocumentChunks([])
                setTimeTaken(-1)
            }
            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryVectorStoreApi.error])

    useEffect(() => {
        if (getVectorStoreNodeDetailsApi.data) {
            const node = getVectorStoreNodeDetailsApi.data
            fetchVectorStoreDetails(node)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getVectorStoreNodeDetailsApi.data])

    const fetchVectorStoreDetails = (component) => {
        const nodeData = cloneDeep(initNode(component, uuidv4()))
        if (documentStore.vectorStoreConfig) {
            nodeData.inputs = documentStore.vectorStoreConfig.config
            nodeData.credential = documentStore.vectorStoreConfig.config.credential
        }
        setSelectedVectorStoreProvider(nodeData)
    }

    useEffect(() => {
        getSpecificDocumentStoreApi.request(storeId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getSpecificDocumentStoreApi.data) {
            setDocumentStore(getSpecificDocumentStoreApi.data)
            const vectorStoreConfig = getSpecificDocumentStoreApi.data.vectorStoreConfig
            if (vectorStoreConfig) {
                getVectorStoreNodeDetailsApi.request(vectorStoreConfig.name)
            }
            setLoading(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificDocumentStoreApi.data])

    return (
        <>
            <MainCard style={{ position: 'relative' }}>
                <Stack flexDirection='column' sx={{ gap: 1 }}>
                    <ViewHeader
                        isBackButton={true}
                        search={false}
                        title={documentStore?.name || 'Document Store'}
                        description='Retrieval Playground - Test your vector store retrieval settings'
                        onBack={() => navigate(-1)}
                    ></ViewHeader>
                    <div style={{ width: '100%' }}></div>
                    <div>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={12} md={12} lg={12}>
                                <Box>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography variant='overline'>
                                            Enter your Query<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>

                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        size='small'
                                        multiline={true}
                                        rows={2}
                                        sx={{ mt: 1 }}
                                        type='string'
                                        fullWidth
                                        key='query'
                                        onChange={(e) => setQuery(e.target.value)}
                                        value={query ?? ''}
                                        endAdornment={
                                            <IconButton variant='contained' onClick={doQuery}>
                                                <IconSearch />
                                            </IconButton>
                                        }
                                    />
                                </Box>
                            </Grid>
                            <Grid container spacing={1}>
                                <Grid item xs={12} sm={4} md={4}>
                                    <Box>
                                        <Grid container spacing='2'>
                                            <Grid item xs={12} md={12} lg={12} sm={12}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        paddingRight: 15,
                                                        paddingTop: 5
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            flexDirection: 'row',
                                                            p: 1
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: 40,
                                                                height: 40,
                                                                borderRadius: '50%',
                                                                backgroundColor: 'white',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                boxShadow: '0 2px 14px 0 rgb(32 40 45 / 25%)'
                                                            }}
                                                        >
                                                            {selectedVectorStoreProvider.label ? (
                                                                <img
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        padding: 7,
                                                                        borderRadius: '50%',
                                                                        objectFit: 'contain'
                                                                    }}
                                                                    alt={selectedVectorStoreProvider.label ?? 'embeddings'}
                                                                    src={`${baseURL}/api/v1/node-icon/${selectedVectorStoreProvider?.name}`}
                                                                />
                                                            ) : (
                                                                <Embeddings color='black' />
                                                            )}
                                                        </div>
                                                        <Typography sx={{ ml: 2 }} variant='h3'>
                                                            {selectedVectorStoreProvider.label}
                                                        </Typography>
                                                        <div style={{ flex: 1 }}></div>
                                                    </Box>
                                                    {selectedVectorStoreProvider &&
                                                        Object.keys(selectedVectorStoreProvider).length > 0 &&
                                                        (selectedVectorStoreProvider.inputParams ?? [])
                                                            .filter((inputParam) => !inputParam.hidden)
                                                            .map((inputParam, index) => (
                                                                <DocStoreInputHandler
                                                                    key={index}
                                                                    data={selectedVectorStoreProvider}
                                                                    inputParam={inputParam}
                                                                    isAdditionalParams={inputParam.additionalParams}
                                                                />
                                                            ))}
                                                </div>
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={8} md={8}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            flexDirection: 'row',
                                            p: 1,
                                            paddingTop: 2,
                                            marginBottom: 4
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                backgroundColor: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 14px 0 rgb(32 40 45 / 25%)'
                                            }}
                                        >
                                            <IconFileStack
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    padding: 7,
                                                    borderRadius: '50%',
                                                    objectFit: 'contain'
                                                }}
                                            />
                                        </div>
                                        <Typography sx={{ ml: 2 }} variant='h3'>
                                            Retrieved Documents
                                            {timeTaken > -1 && (
                                                <Typography variant='body2' sx={{ color: 'gray' }}>
                                                    Count: {documentChunks.length}. Time taken: {timeTaken} millis.
                                                </Typography>
                                            )}
                                            {retrievalError && (
                                                <Typography variant='body2' sx={{ color: 'gray' }}>
                                                    {retrievalError}
                                                </Typography>
                                            )}
                                        </Typography>
                                        <div style={{ flex: 1 }}></div>
                                    </Box>
                                    {!documentChunks.length && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                width: '100%'
                                            }}
                                        >
                                            <Box sx={{ mt: 5, p: 2, height: 'auto' }}>
                                                <img
                                                    style={{ objectFit: 'cover', height: '16vh', width: 'auto' }}
                                                    src={chunks_emptySVG}
                                                    alt='chunks_emptySVG'
                                                />
                                            </Box>
                                            <div>No Documents Retrieved</div>
                                        </div>
                                    )}
                                    <Grid container spacing={2}>
                                        {documentChunks?.length > 0 &&
                                            documentChunks.map((row, index) => (
                                                <Grid item lg={6} md={6} sm={6} xs={6} key={index}>
                                                    <CardWrapper
                                                        content={false}
                                                        onClick={() => chunkSelected(row.id, index + 1)}
                                                        sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                                    >
                                                        <Card>
                                                            <CardContent sx={{ p: 2 }}>
                                                                <Typography sx={{ wordWrap: 'break-word', mb: 1 }} variant='h5'>
                                                                    {`#${index + 1}. Characters: ${row.pageContent.length}`}
                                                                </Typography>
                                                                <Typography sx={{ wordWrap: 'break-word' }} variant='body2'>
                                                                    {row.pageContent}
                                                                </Typography>
                                                                <ReactJson
                                                                    theme={customization.isDarkMode ? 'ocean' : 'rjv-default'}
                                                                    style={{ paddingTop: 10 }}
                                                                    src={row.metadata || {}}
                                                                    name={null}
                                                                    quotesOnKeys={false}
                                                                    enableClipboard={false}
                                                                    displayDataTypes={false}
                                                                    collapsed={true}
                                                                />
                                                            </CardContent>
                                                        </Card>
                                                    </CardWrapper>
                                                </Grid>
                                            ))}
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </div>
                </Stack>
            </MainCard>
            <ConfirmDialog />
            <ExpandedChunkDialog
                show={showExpandedChunkDialog}
                dialogProps={expandedChunkDialogProps}
                onCancel={() => setShowExpandedChunkDialog(false)}
                isReadOnly={true}
            ></ExpandedChunkDialog>
            {loading && <BackdropLoader open={loading} />}
        </>
    )
}

export default VectorStoreQuery
