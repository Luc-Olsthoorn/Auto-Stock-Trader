const alpha = require('alphavantage')({key:process.env.ALPHAKEY});
const regression = require('regression');
const moment = require('moment');
const prompt = require('prompt-async');

const stonks =[
  {name:'VOO', desiredAssetAllocation:.55},
  {name:'VEA', desiredAssetAllocation:.15},
  {name:'BND', desiredAssetAllocation:.15},
  {name:'VPL', desiredAssetAllocation:.15}
];

const main = async () =>{
  console.log(`How much money do you want to allocate`);
  prompt.start();
  const {totalMoney} = await prompt.get('totalMoney');

  let stonksData = [];
  for(let i =0; i<stonks.length; i++){
    let stonk = stonks[i];
    let regressionValue = await getLinearRegressionSpread(stonk.name);
    let currentValue = await getCurrentValue(stonk.name);
    let numberOfStocks = await getnumberOfStocks(stonk.name);
    let linearSpread = (regressionValue - currentValue)/(regressionValue);

    stonksData.push({
      ...stonk,
      numberOfStocks: Number(numberOfStocks),
      linearSpread: Number(linearSpread),
      regressionValue: Number(regressionValue),
      currentValue: Number(currentValue),
    });
  }
  let stonksToBuy = bigAlgoRiddim(stonksData, totalMoney);
  console.log('buy these stocks');
  await sleep(1000);
  console.log(stonksToBuy);
  await sleep(1000);
  console.log('based on these stats:');
  await sleep(1000);
  console.log(stonksData);

}

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}
const workAround = async () => {
  console.log("sleeping...");
  await sleep(12000);
  console.log('awake!');
}

const bigAlgoRiddim = (stonksData, totalMoney) => {
  let newStonksData = stonksData;
  let returnData = {}
  let cost = 0;
  while(cost<totalMoney){
    newStonksData = calculatePortfolioSpread(newStonksData);
    console.log(newStonksData);
    let pick = calculateBestPick(newStonksData);
    if(Number(newStonksData[pick].currentValue) + cost > totalMoney){
      break;
    }
    newStonksData[pick].numberOfStocks += 1;
    if(returnData[newStonksData[pick].name]){
      returnData[newStonksData[pick].name]+=1;
    }else{
      returnData[newStonksData[pick].name]=1;
    }

    cost += Number(newStonksData[pick].currentValue);

  }
  return returnData;
}
const calculateBestPick = (stonksData) => {
  let best = -100;
  let pick = null;
  for(let i =0; i<stonksData.length; i++){
    let stonk = stonksData[i];
    let value = (stonk.linearSpread-stonk.assetAllocationSpread)
    if (best < value){
      pick = i;
      best = value;
    }
  }
  return pick;
}
const calculatePortfolioSpread = (stonksData) => {
  let total = 0;
  stonksData.forEach((stonk)=>{
    total+=(stonk.numberOfStocks*stonk.currentValue);
  });
  let returnStonksData = stonksData.map((stonk)=>{
    if(total==0) total = 1;//prevent divide by zero
    const currentAssetAllocation = ((stonk.numberOfStocks*stonk.currentValue)/total);
    const assetAllocationSpread =  currentAssetAllocation - stonk.desiredAssetAllocation;
    return {
      ...stonk,
      currentAssetAllocation: currentAssetAllocation,
      assetAllocationSpread: assetAllocationSpread
    }
  });
  return returnStonksData;
}

const getnumberOfStocks = async (stonkName) => {
  console.log(`How many stocks of ${stonkName} do you have`);
  prompt.start();
  const {quantity} = await prompt.get('quantity');
  return quantity;
}

const getCurrentValue = async (stonkName) =>{
  await workAround();
  let data = await alpha.data.quote(stonkName);
  return data['Global Quote']['05. price'];
}
const getLinearRegressionSpread = async (stonkName) =>{
  await workAround();
  let data = await alpha.data.daily(stonkName);
  let parsed = parseAlpha(data);
  let equation = runRegression(parsed);
  let today = moment().valueOf();
  let prediction = equation.predict(today);
  return prediction[1];
}

const parseAlpha = (data) => {
  let monthlyData = data['Time Series (Daily)'];
  let parsed = [];
  Object.keys(monthlyData).forEach((key)=>{
    let day = moment(key);
    let open = Number(monthlyData[key]['1. open']);
    parsed.push([day.valueOf(), open]);
  });
  return parsed;
}

const runRegression = (values) =>{
  const result = regression.linear(values, {order: 2,precision: 12,});
  return result;
}
main();
