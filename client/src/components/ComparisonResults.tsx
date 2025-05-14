import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarIcon } from "lucide-react";
import { TransferResult } from "@shared/schema";

type ComparisonResultsProps = {
  results: TransferResult[];
  visible: boolean;
};

const ComparisonResults = ({ results, visible }: ComparisonResultsProps) => {
  if (!visible || results.length === 0) {
    return null;
  }

  const formatCurrency = (value: number, currency: string) => {
    const formatter = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'NGN' ? 0 : 2,
      maximumFractionDigits: currency === 'NGN' ? 0 : 2,
    });
    return formatter.format(value);
  };

  // Best provider is the first in the sorted results
  const bestProvider = results[0];
  const otherProviders = results.slice(1);

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return null;
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center text-yellow-500">
        {[...Array(fullStars)].map((_, i) => (
          <StarIcon key={`full-${i}`} className="h-4 w-4 fill-yellow-500" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <StarIcon className="h-4 w-4 fill-yellow-500" />
            <StarIcon className="absolute top-0 right-0 h-4 w-4 fill-gray-300" style={{ clipPath: 'inset(0 0 0 50%)' }} />
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <StarIcon key={`empty-${i}`} className="h-4 w-4 fill-gray-300" />
        ))}
        <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">
          ({rating.toFixed(1)}/5)
        </span>
      </div>
    );
  };

  return (
    <section id="comparison-results" className="py-12 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          Best Transfer Options from UK to Nigeria
        </h2>

        {/* Best Provider Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 bg-green-500 text-white flex items-center">
            <div className="rounded-full bg-white p-1 mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-green-500"
              >
                <path d="M19.67 7.64c-.09-.44-.28-.85-.56-1.2-.37-.46-.86-.79-1.41-.94-.33-.11-.68-.16-1.03-.16-.18 0-.36.02-.54.05-.44.07-.88.22-1.29.44-.38.21-.74.48-1.08.8-.27.26-.53.55-.78.84-.24.29-.49.58-.73.88-.24-.3-.48-.59-.72-.88-.25-.3-.5-.58-.77-.84-.34-.32-.7-.59-1.08-.8-.41-.22-.85-.37-1.29-.44A3.76 3.76 0 0 0 8 5.34c-.35 0-.7.05-1.03.16a3.95 3.95 0 0 0-1.41.94c-.28.35-.47.76-.56 1.2-.1.43-.12.86-.07 1.29.05.42.17.83.35 1.21.18.38.4.74.67 1.08l4.7 5.63c.28.33.68.53 1.1.53.42 0 .82-.19 1.1-.53l4.69-5.62c.27-.32.5-.7.68-1.08.18-.38.3-.79.35-1.21.05-.43.03-.86-.06-1.28Z" fill="currentColor"></path>
              </svg>
            </div>
            <span className="font-medium">Best Option</span>
          </div>

          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="md:w-1/4 mb-4 md:mb-0 flex items-center">
                {bestProvider.providerLogo ? (
                  <img
                    src={bestProvider.providerLogo}
                    alt={`${bestProvider.providerName} Logo`}
                    className="h-10 mr-4"
                  />
                ) : (
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mr-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-gray-500 dark:text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                    {bestProvider.providerName}
                  </h3>
                  {renderStars(bestProvider.rating)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:w-2/3">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Exchange Rate</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    1 GBP = {bestProvider.exchangeRate.toLocaleString()} NGN
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fee</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {formatCurrency(bestProvider.fee, 'GBP')}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Recipient Gets</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {formatCurrency(bestProvider.receivedAmount, 'NGN')}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Transfer Time</p>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {bestProvider.transferTime || "Unknown"}
                  </p>
                </div>
              </div>

              <div className="md:w-1/6 mt-4 md:mt-0 flex justify-center">
                <Button 
                  className="w-full bg-green-500 hover:bg-green-600"
                  onClick={() => window.open(bestProvider.websiteUrl || '#', '_blank')}
                >
                  Select
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Other Providers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Provider
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Exchange Rate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Recipient Gets
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Transfer Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {otherProviders.map((provider, index) => (
                <tr key={provider.providerId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {provider.providerLogo ? (
                        <img
                          src={provider.providerLogo}
                          alt={`${provider.providerName} Logo`}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-gray-500 dark:text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {provider.providerName}
                        </div>
                        {renderStars(provider.rating)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    1 GBP = {provider.exchangeRate.toLocaleString()} NGN
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatCurrency(provider.fee, 'GBP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatCurrency(provider.receivedAmount, 'NGN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {provider.transferTime || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href={provider.websiteUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-800"
                    >
                      Select
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ComparisonResults;
