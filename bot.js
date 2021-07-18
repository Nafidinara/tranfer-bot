const Web3 = require('web3');
const chalk = require('chalk');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();


let web3;
let web3Ws;
let deadline;

const createWeb3 = async() => {
    try{
        web3 = new Web3(process.env.WSS_URL);
        web3Ws = new Web3(new Web3.providers.WebsocketProvider(process.env.WSS_URL));
        return true;
    }catch(err){
        console.log(JSON.stringify(err));
        return false;
    }
}

const myAccount = async (privateKey) => {
    try{
        return web3.eth.accounts.privateKeyToAccount(privateKey);
    }catch(err){
        console.log(err);
        return false;
    }
}

const checkBalance = async (address) => {
    let res = await axios.get(`https://api.bscscan.com/api?module=account&action=balance&address=${address}&tag=latest&apikey=${process.env.API_KEY}`);
    let balance = web3.utils.fromWei(res.data.result, 'ether');

    console.log(chalk.cyan('= = = = = = = = = = = = = = = = = = = = = = = = = = ='));
    console.log(chalk.yellow(`balance in ${address} is ${balance} BNB`));
    console.log(chalk.cyan('= = = = = = = = = = = = = = = = = = = = = = = = = = ='));
    return res.data;
}

const run = async() => {
    let dataBalance, balance, amountSend, fee, minBalance;
    try{
        //check sender balance
        if (await createWeb3() === false){
            process.exit();
        }

        dataBalance = await checkBalance(process.env.ADDRESS_SENDER);
        balance = dataBalance.result;
        minBalance = web3.utils.toWei(process.env.MIN_AMOUNT, 'ether');
        fee = web3.utils.toWei('0.003', 'ether');

        amountSend = balance - fee;

        if (amountSend >= parseInt(minBalance)){
            console.log(chalk.green(`Will send ${amountSend} to ${process.env.ADDRESS_RECEPIENT}`));
            return transfer(amountSend,process.env.ADDRESS_SENDER,process.env.ADDRESS_RECEPIENT);
        }else{
            console.log('insufficient balance');
            return false;
        }
    }
    catch(err){
        console.log(JSON.stringify(err));
        // process.exit();
    }
}

const transfer = async (amount, senderAddress, receiverAddress) => {
    let tx, account, gasPrice, signedTx;

    gasPrice = await web3.eth.getGasPrice();

    tx = {
        from: senderAddress,
        to: receiverAddress,
        data: '0x',
        gas: 500000,
        gasPrice: gasPrice,
        value: amount
    };

    account = await myAccount(process.env.PK_SENDER);
    signedTx = await account.signTransaction(tx);

    return web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        .on('transactionHash', (hash) => {
            console.log(`hash : https://bscscan.com/tx/${hash}`);
            return true;
        })
        .on('error', (error => {
            console.log(JSON.stringify(error));
            return false;
        }));
}

setInterval(async () => {
    await run();
},process.env.INTERVAL * 1000);

