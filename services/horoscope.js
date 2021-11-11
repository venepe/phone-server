import axios from 'axios';
import moment from 'moment';
import { makeKeysCamelCase, capitalizeFirstLetter } from '../utilities';
const zodiac = require('zodiac-signs')('en');

const getHoroscope = async ({ birthdate }) => {
  const day = moment(birthdate).format('D');
  const month = moment(birthdate).format('M');
  const sign = zodiac.getSignByDate({ day, month }).name;
  const url = `https://aztro.sameerkumar.website?sign=${sign}&day=today`;
  const { data } = await axios({
    method: 'POST',
    url,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  data.sign = capitalizeFirstLetter(sign);
  const horoscope = makeKeysCamelCase(data);
  return horoscope;
}

export default {
  getHoroscope,
};
