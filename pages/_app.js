import '../styles/globals.css'
import 'bootstrap/dist/css/bootstrap.min.css'; // install bootstrap to get access to the bootstrap classes to easily style the frontend

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp
