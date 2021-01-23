import axios from 'axios';
import config from '../config';
const BUBBLEPOP_API_URL = config.get('BUBBLEPOP_API_URL');
const CUTTLY_API_KEY = config.get('CUTTLY_API_KEY');

const shortenUrl = async ({ code }) => {
  const urlToShorten = encodeURIComponent(`${BUBBLEPOP_API_URL}/invitations?code=${code}`);
  const url = `https://cutt.ly/api/api.php?key=${CUTTLY_API_KEY}&short=${urlToShorten}`;
  const { data: { url: { shortLink } } } = await axios({
    method: 'GET',
    url,
    responseType: 'application/json',
  });
  console.log(url);
  return shortLink;
};

export default {
  shortenUrl,
};
