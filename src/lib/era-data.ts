/**
 * Server-only access to the compiled era data (src/data/era-*.json, from scripts/build-era.mjs).
 * Server components import this; client components get only one year's slice as props
 * (`stockSlice`, `countrySlice`), never the whole files.
 */
import eventsJson from '@/data/era-events.json';
import constructionJson from '@/data/era-construction.json';
import stockJson from '@/data/era-stock.json';
import censusJson from '@/data/era-census.json';
import {
  countrySlice,
  eventsAround,
  stockSlice,
  type CensusData,
  type ConstructionData,
  type CountrySlice,
  type EventPick,
  type EventsData,
  type StockData,
  type StockSlice,
} from './era';

export const ERA_EVENTS = eventsJson as unknown as EventsData;
export const CONSTRUCTION = constructionJson as unknown as ConstructionData;
export const STOCK = stockJson as unknown as StockData;
export const CENSUS = censusJson as unknown as CensusData;

export const getEventsAround = (year: number): EventPick => eventsAround(ERA_EVENTS, year);
export const getStockSlice = (year: number): StockSlice => stockSlice(STOCK, year);
export const getCountrySlice = (year: number): CountrySlice => countrySlice(CENSUS, year);

/** Sources and caveats for the client sections (small, shared by every year). */
export const stockSources = () => STOCK.sources;
export const censusMeta = () => ({ sources: CENSUS.sources, notes: CENSUS.notes, stockVintage: CENSUS.stock.vintage, yb1950Note: CENSUS.yearBuilt1950.note });
