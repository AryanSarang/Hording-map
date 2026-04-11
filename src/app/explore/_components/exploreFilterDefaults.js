/**
 * Default explore landing: Mumbai + cinema media (applied on load without credits).
 */

export function buildDefaultExploreLandingFilters(hoardings, initialMaxPrice) {
    const maxPrice = Number.isFinite(initialMaxPrice) && initialMaxPrice > 0 ? initialMaxPrice : 100000;
    const allTypes = [...new Set(hoardings.map((h) => h.mediaType).filter(Boolean))];

    if (!hoardings.length) {
        return {
            states: [],
            cities: [],
            vendorIds: [],
            minPrice: 0,
            maxPrice: maxPrice,
            mediaTypes: allTypes,
        };
    }

    const cinemaTypes = allTypes.filter((t) => /cinema/i.test(String(t)));
    const mumbaiCityNames = [
        ...new Set(
            hoardings
                .filter((h) => /mumbai/i.test(String(h.city || '')))
                .map((h) => h.city)
                .filter(Boolean)
        ),
    ];
    const statesForMumbai = [
        ...new Set(
            hoardings
                .filter((h) =>
                    mumbaiCityNames.some(
                        (c) => String(c).toLowerCase() === String(h.city || '').toLowerCase()
                    )
                )
                .map((h) => h.state)
                .filter(Boolean)
        ),
    ];

    const hasMumbaiCinema = hoardings.some(
        (h) =>
            cinemaTypes.includes(h.mediaType) &&
            mumbaiCityNames.some(
                (c) => String(c).toLowerCase() === String(h.city || '').toLowerCase()
            )
    );

    if (!hasMumbaiCinema || cinemaTypes.length === 0 || mumbaiCityNames.length === 0) {
        return {
            states: [],
            cities: [],
            vendorIds: [],
            minPrice: 0,
            maxPrice: maxPrice,
            mediaTypes: allTypes,
        };
    }

    return {
        states: statesForMumbai,
        cities: mumbaiCityNames,
        vendorIds: [],
        minPrice: 0,
        maxPrice: maxPrice,
        mediaTypes: cinemaTypes,
    };
}
