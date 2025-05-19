import { createContext } from 'react';
import { Restaurant } from '../types';

interface RestaurantContextType {
  restaurant: Restaurant;
  setRestaurant: (restaurant: Restaurant) => void;
}

export const RestaurantContext = createContext<RestaurantContextType>({
  restaurant: {
    name: '',
    logo: '',
    phone: '',
    address: '',
    openingHours: '',
  },
  setRestaurant: () => {},
});
