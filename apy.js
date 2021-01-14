import Compound from '@compound-finance/compound-js';

// Infura endpoint URL
const provider = '';

// get compound comptroller
const comptroller = Compound.util.getAddress(Compound.Comptroller);
// get compound oracle price feed
const oraclePriceFeed = Compound.util.getAddress(Compound.PriceFeed);

const cTokenDecimals = 8;
const blocksPerDay = 4 * 60 * 24; // number of blocks per day (around 4 blocks per minute, i.e. one new block every 15 seconds)
const daysPerYear = 365;
// ethMantissa = scaling factor used by Compound; some data returned from Compound smart contracts will be multiplied by this factor. 
// Divide the value returned by ethMantissa to get the real value. 
// This indirection is used in order to deal with decimal numbers in a smart contract.
const ethMantissa = Math.pow(10, 18); 

// calculate cToken supply APY
async function calculateSupplyApy(cTokenAddress) {
    // get the current supply rate per block for the specified cToken from Compound (if the annual supply rate = 4%, then this per block supply rate is going to be way less)
    // use Compound.eth.read() in order to read data from the Compound smart contract using the compound-js library
    // pass the smart contract address, 
    // then the smart contract function signature (can be found in the Compound github repo), 
    // then any arguments (pass '[]' for no arguments),
    // and finally the provider, so the compound library knows how to connect to the blockchain
    const supplyRatePerBlock = await Compound.eth.read(
        cTokenAddress, 
        'function supplyRatePerBlock() returns(uint)', 
        [],
        { provider }
        );
    // compound the returned supply rate per block for each block of the year, so we can get the annualized rate
    return 100 * (Math.pow((supplyRatePerBlock / ethMantissa * blocksPerDay) + 1, daysPerYear - 1) -1);
    // rate per day = Math.pow((supplyRatePerBlock / ethMantissa * blocksPerDay)
    // the returned supplyRatePerBlock is scaled by 10**18, so we need to divide by it to get the real number
    // the rate per day needs to be compounded by the daysPerYear: subtract 1, as the number of periods in a year is 1 less than the number of days
    // subtract 1 again to keep the decimal part
    // finally transform into a percentage by multiplying by 100
}

// calculate COMP token APY for a given cToken market (i.e. if cToken = cDAI, then the underlying asset = DAI)
// COMP tokens are are given to lenders and borrowers each block as part of the liquidity mining program incentives of Compound
async function calculateCompApy(cTokenAddress, underlyingTicker, underlyingDecimals) {
    //console.log(`Processing: ${underlyingTicker}`);

    // get the amount of COMP tokens that will be distributed to borrowers and lenders in this market for the current block
    let compSpeed = await Compound.eth.read(
        comptroller,
        'function compSpeeds(address cToken) public view returns(uint)',
        [ cTokenAddress ],
        { provider }
    );
    //console.log(`Returned compSpeed: ${compSpeed}`);

    // get COMP token price from the oracle smart contract
    let compPrice = await Compound.eth.read(
        oraclePriceFeed,
        'function price(string memory symbol) external view returns(uint)',
        [ Compound.COMP ],
        { provider }
    );
    //console.log(`Returned compPrice: ${compPrice}`);

    // get underlying asset price from the oracle smart contract
    let underlyingPrice = await Compound.eth.read(
        oraclePriceFeed,
        'function price(string memory symbol) external view returns(uint)',
        [ underlyingTicker ],
        { provider }
    );
    //console.log(`Returned underlyingPrice: ${underlyingPrice}`);

    // get the total supply of cTokens minted: i.e. the more lenders there are, the more cTokens are minted
    let totalSupply = await Compound.eth.read(
        cTokenAddress,
        'function totalSupply() public view returns(uint)',
        [],
        { provider }
    );
    //console.log(`Returned totalSupply: ${totalSupply}`);

    // get the cToken exchange rate from the oracle smart contract, i.e. if the cToken = cDAI and it's exchange rate = 10, then to buy 1 cDAI we need 10 DAI
    let exchangeRate = await Compound.eth.read(
        cTokenAddress,
        'function exchangeRateCurrent() public returns(uint)',
        [],
        { provider }
    );
    //console.log(`Returned exchangeRate: ${exchangeRate}`);

    // adjust the returned variables, as they are all scaled up by the smart contracts in order to deal with decimals/fractions
    compSpeed = compSpeed / 1e18; // divide by 10^18 because the COMP token has 18 decimals
    //console.log(`Adjusted compSpeed: ${compSpeed}`);

    compPrice = compPrice / 1e6; // divide by 10^6 (smart contract returns scaled values in order to handle decimals)
    //console.log(`Adjusted compPrice: ${compPrice}`);

    underlyingPrice = underlyingPrice / 1e6;
    //console.log(`Adjusted underlyingPrice: ${underlyingPrice}`);

    exchangeRate = +exchangeRate.toString() / ethMantissa; // '+' before 'exchangeRate' = trick to transform the variable into a number
    //console.log(`Adjusted exchangeRate: ${exchangeRate}`);

    // calculate the total supply of underlying tokens
    // calculate the USD value of underlying token supply
    // in terms of full tokens
    totalSupply = (+totalSupply.toString() * exchangeRate * underlyingPrice) / (Math.pow(10, underlyingDecimals));
    //console.log(`Adjusted totalSupply: ${totalSupply}`);

    // get number of COMP tokens distributed/mined per day to all lenders and borrowers in the market
    const compPerDay = compSpeed * blocksPerDay;
    //console.log(`Calculated compPerDay: ${compPerDay}`);

    // finally return the full APY
    // compPrice * compPerDay = USD value of COMP tokens that all the market participants receive
    // * 365 as there is no compounding effect
    // * 100 to make a percentage
    //console.log(`Calculated final COMP apy: ${100 * ((compPrice * compPerDay / totalSupply) * 365)}`);
    return 100 * ((compPrice * compPerDay / totalSupply) * 365);
}

async function calculateApy(cTokenTicker, underlyingTicker) {
    const underlyingDecimals = Compound.decimals[cTokenTicker.slice(1, 10)];
    const cTokenAddress = Compound.util.getAddress(cTokenTicker);
    const [supplyApy, compApy] = await Promise.all([ // Promise.all() = execute multiple async functions at the same time
        calculateSupplyApy(cTokenAddress),
        calculateCompApy(cTokenAddress, underlyingTicker, underlyingDecimals),
    ]);
    return {ticker: underlyingTicker, supplyApy, compApy};
}

export default calculateApy; // export the main function so it can be consumed from another file