const express = require('express');
const {
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
} = require('./po');
const {
  createGoodsReceiptNote,
  getGoodsReceiptNote,
  listGoodsReceiptNotes,
} = require('./grn');
const {
  createInvoice,
  getInvoice,
  getInvoiceById,
  listInvoices,
} = require('./invoice');
const {
  matchInvoice,
  getMatchHistory,
} = require('./matcher');

const app = express();

app.use(express.json());

// ==========================================
// Purchase Order Routes
// ==========================================
const poRouter = express.Router();

poRouter.post('/', (req, res, next) => {
  try {
    const po = createPurchaseOrder(req.body);
    res.status(201).json(po);
  } catch (err) {
    next(err);
  }
});

poRouter.get('/', (req, res, next) => {
  try {
    const list = listPurchaseOrders(req.query);
    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
});

poRouter.get('/:idOrNumber', (req, res, next) => {
  try {
    const po = getPurchaseOrder(req.params.idOrNumber);
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }
    res.status(200).json(po);
  } catch (err) {
    next(err);
  }
});

app.use('/api/po', poRouter);
app.use('/api/pos', poRouter);

// ==========================================
// Goods Receipt Note Routes
// ==========================================
const grnRouter = express.Router();

grnRouter.post('/', (req, res, next) => {
  try {
    const grn = createGoodsReceiptNote(req.body);
    res.status(201).json(grn);
  } catch (err) {
    next(err);
  }
});

grnRouter.get('/', (req, res, next) => {
  try {
    const list = listGoodsReceiptNotes(req.query);
    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
});

grnRouter.get('/:idOrNumber', (req, res, next) => {
  try {
    const grn = getGoodsReceiptNote(req.params.idOrNumber);
    if (!grn) {
      return res.status(404).json({ error: 'Goods Receipt Note not found' });
    }
    res.status(200).json(grn);
  } catch (err) {
    next(err);
  }
});

app.use('/api/grn', grnRouter);
app.use('/api/grns', grnRouter);

// ==========================================
// Invoice & Matching Routes
// ==========================================
const invoiceRouter = express.Router();

invoiceRouter.post('/', (req, res, next) => {
  try {
    const invoice = createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

invoiceRouter.get('/', (req, res, next) => {
  try {
    const list = listInvoices(req.query);
    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
});

// Matching execution
invoiceRouter.post('/:id/match', async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const numericId = !isNaN(rawId) ? Number(rawId) : rawId;
    const inv = getInvoiceById(numericId) || getInvoice(numericId);
    if (!inv) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const options = {
      priceTolerancePercent: req.body?.priceTolerancePercent !== undefined ? Number(req.body.priceTolerancePercent) : 0.0,
      quantityTolerancePercent: req.body?.quantityTolerancePercent !== undefined ? Number(req.body.quantityTolerancePercent) : 0.0,
    };

    const matchResult = await matchInvoice(inv.id, options);
    res.status(200).json(matchResult);
  } catch (err) {
    next(err);
  }
});

// Match history retrieval
invoiceRouter.get('/:id/match', async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const numericId = !isNaN(rawId) ? Number(rawId) : rawId;
    const inv = getInvoiceById(numericId) || getInvoice(numericId);
    if (!inv) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const history = await getMatchHistory(inv.id);
    res.status(200).json(history);
  } catch (err) {
    next(err);
  }
});

invoiceRouter.get('/:idOrNumber', (req, res, next) => {
  try {
    const rawParam = req.params.idOrNumber;
    const numericParam = !isNaN(rawParam) ? Number(rawParam) : rawParam;
    let inv = null;
    if (typeof numericParam === 'number') {
      inv = getInvoiceById(numericParam) || getInvoice(numericParam);
    } else {
      inv = getInvoice(rawParam);
    }

    if (!inv) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(200).json(inv);
  } catch (err) {
    next(err);
  }
});

app.use('/api/invoices', invoiceRouter);
app.use('/api/invoice', invoiceRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  let status = err.statusCode || err.status;
  if (!status) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
      status = 409;
    } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (err.message && err.message.includes('FOREIGN KEY constraint failed'))) {
      status = 400;
    } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      status = 400;
    } else {
      status = 500;
    }
  }

  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code,
  });
});

app.app = app;
module.exports = app;
module.exports.app = app;
