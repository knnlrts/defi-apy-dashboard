import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Compound from '@compound-finance/compound-js';
import calculateApy from '../apy.js';

// before the dashboard HTML can be created, we need to fetch the APYs from the Compound smart contracts
export default function Home({ apys }) { // extract the injected apys array. && = trick to check if apys is undefined, if not undefined, then iterate over all elements
  const formatPercent = number => // => is shorthand notation to return something without the return keyword
    `${new Number(number).toFixed(2)}%` // toFixed(2) will return only 2 decimals to the input number
  return (
    <div className='container'>

      <Head>
        <title>Compound dashboard</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className='row mt-4'>
        <div className='col-sm-12'>
          <div className="jumbotron">
            <h1 className='display-4 text-center'>Compound APY Dashboard</h1>
            <h5 className="text-center">Shows Compound APYs <br/> with COMP token rewards</h5>
          </div>
        </div>
      </div>

      <table className='table'>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Supply APY</th>
            <th>COMP token APY</th>
            <th>Total APY</th>
          </tr>
        </thead>
        <tbody>
          {apys && apys.map(apy => (
            <tr key={apy.ticker}>
              <td>
                <img 
                  src={`img/asset_${apy.ticker.toUpperCase()}.svg`}
                  style={{width: 25, height: 25, marginRight: 10}}
                />
                {apy.ticker.toUpperCase()}
              </td>
              <td>
                {formatPercent(apy.supplyApy)}
              </td>
              <td>
                {formatPercent(apy.compApy)}
              </td>
              <td>
                {formatPercent(parseFloat(apy.supplyApy) + parseFloat(apy.compApy))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  )
}

// getServerSideProps from the Next.js framework
// when Next.js will receives a request for the Home component, it will execute the getServerSideProps function before
// this is where we will fetch the smart contract data that we need
export async function getServerSideProps(context) {
  const apys = await Promise.all([
    calculateApy(Compound.cDAI, 'DAI'),
    calculateApy(Compound.cUSDC, 'USDC'),
    calculateApy(Compound.cUSDT, 'USDT'),
    calculateApy(Compound.cETH, 'ETH'),
    calculateApy(Compound.cCOMP, 'COMP'),
    calculateApy(Compound.cBAT, 'BAT'),
    calculateApy(Compound.cUNI, 'UNI'),
    calculateApy(Compound.cZRX, 'ZRX'),
  ]);
  // return the apys array as props (another Next.js convention)
  return {
    props: {
      apys
    }
  }
}