const axios = require('axios');
const Decimal = require('decimal.js');
const numeral = require('numeral');
const fs = require('fs');

const USER_ADDRESS = '0xf70B82b04d828106386D9AB916FAf0746E128aB7';

const getPrice = async (timestamp) => { 
    const endTimestamp = timestamp + (5 * 60 * 1000);
    const response = await axios.get(
        `https://api.binance.com/api/v3/klines?symbol=BNBUSDT&interval=1m&startTime=${timestamp}&endTime=${endTimestamp}`
    );
    return response.data[0][4];
}

const fetchTransactions = async (address) => { 
    const response = await axios.get(
        `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=asc&apikey=EAHPKDNXJENAW3HCPKB17PD94TKUCTRAAX`
    );
    return response.data.result;
}

// Run async function
(async () => {
    const rows = []
    rows[0] = 'Date,Amount In BNB,Price, Amount in USD, From, To, Direction'
    const numeralFormat = '0,0';
    let totalInflowInUSD = 0;
    let totalOutflowInUSD = 0;
    let totalInflowInBNB = 0;
    let totalOutflowInBNB = 0;
    const transactions = await fetchTransactions(USER_ADDRESS);
    for (const transaction of transactions) {
        const date = new Date(transaction.timeStamp * 1000);
        const amountInBnb = new Decimal(transaction.value).div(1e18).toFixed(6).toString();
        const price = await getPrice(transaction.timeStamp * 1000);
        const amountInUsd = new Decimal(amountInBnb).mul(price).toFixed(2).toString();
        const from = transaction.from;
        const to = transaction.to;
        const direction = from.toLowerCase() === USER_ADDRESS.toLowerCase() ? 'OUT' : 'IN';
        rows.push(
            `${date.toLocaleDateString()},"${numeral(amountInBnb).format(numeralFormat)}","${numeral(price).format(numeralFormat)}","${numeral(amountInUsd).format(numeralFormat)}",${from},${to},${direction}`
        );
        if (direction === 'IN') {
            totalInflowInUSD = new Decimal(totalInflowInUSD).add(amountInUsd).toFixed(2).toString();
            totalInflowInBNB = new Decimal(totalInflowInBNB).add(amountInBnb).toFixed(6).toString();
        }
        if (direction === 'OUT') {
            totalOutflowInUSD = new Decimal(totalOutflowInUSD).add(amountInUsd).toFixed(2).toString();
            totalOutflowInBNB = new Decimal(totalOutflowInBNB).add(amountInBnb).toFixed(6).toString();
        }
    }
    // reverse rows
    rows.reverse();
    // Bring the last row to the top
    rows.unshift(rows.pop());
    // Add two empty rows
    rows.push('');
    rows.push('');
    // Add totals
    rows.push(`Total Inflow,"${numeral(totalInflowInBNB).format(numeralFormat)} BNB","${numeral(totalInflowInUSD).format(numeralFormat)} USD"`);
    rows.push(`Total Outflow,"${numeral(totalOutflowInBNB).format(numeralFormat)} BNB","${numeral(totalOutflowInUSD).format(numeralFormat)} USD"`);
    
    // Write to a csv file
    fs.writeFileSync('transactions.csv', rows.join('\n'));

    console.log(rows.join('\n'));
    // console.log(`Total Inflow in USD: ${totalInflowInUSD}`);
    // console.log(`Total Inflow in BNB: ${totalInflowInBNB}`);
    // console.log(`Total Outflow in USD: ${totalOutflowInUSD}`);
    // console.log(`Total Outflow in BNB: ${totalOutflowInBNB}`);
}
)().catch(console.error);