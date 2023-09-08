/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            maxWidth: {
                'side-right': '20.4375rem',
                'side-right-md': '18rem',
                '696px': '43.5rem',
                '264px': '16.5rem',
            },
            colors: {
                'gray-050a15': '#050a15',
                'gray-0a1124': '#0a1124',
                'gray-606060': '#606060',
                'gray-505050': '#505050',
                'gray-c4c4c4': '#c4c4c4',
                'gray-e8e8f5': '#e8e8f5',
                'gray-e5e5f9': '#e5e5f9',
                'red-dd3a3a': '#dd3a3a',
                'red-f18888': '#f18888',
                'red-eb7979': '#eb7979',

                extblue: '#61a3ff',

                // refactor
                'gray-7c8db5': '#7c8db5',
                'gray-fafafd': '#fafafd',
                'gray-f6f6f9': '#f6f6f9',
                'gray-53596d': '#53596d',
                'gray-e6edff': '#e6edff',
                'gray-d6e4ee': '#d6e4ee',
                'blue-2b89ff': '#2b89ff',
                'blue-348eff': '#348eff',
                'blue-1e7aec': '#1e7aec',
                'green-34c759': '#34c759',
                'green-deecdc': '#deecdc',
                'green-2fbf5340': '#2fbf5340',
                'red-ff3b30': '#ff3b30',
                'red-ff624d40': '#ff624d40',
                'yellow-faedcc': '#faedcc',
            },
            backgroundImage: {
                'button-border':
                    'linear-gradient(to bottom right, rgba(10, 17, 36, .82) 0%, rgba(10, 17, 36, .26) 45%, rgba(10, 17, 36, .26) 100%)',
                'button-header-border':
                    'linear-gradient(to bottom right, rgba(10, 17, 36, .48) 0%, rgba(10, 17, 36, .07) 45%, rgba(10, 17, 36, .07) 100%)',
                'button-header-focus-border':
                    'linear-gradient(to bottom right, rgba(232, 232, 245, .44) 0%, rgba(229, 229, 249, .29) 45%, rgba(229, 229, 249, .29) 100%)',
                'dropdown-menu-border':
                    'linear-gradient(to bottom right, rgba(10, 17, 36, .82) 0%, rgba(10, 17, 36, .19) 45%, rgba(10, 17, 36, .19) 100%)',
                'block-border':
                    'linear-gradient(to bottom right, rgba(232, 232, 245, .82) 0%, rgba(229, 229, 249, 0) 45%, rgba(229, 229, 249, 0) 100%)',
                'switch-border':
                    'linear-gradient(to bottom right, rgba(10, 17, 36, .82) 0%, rgba(10, 17, 36, .0) 45%, rgba(10, 17, 36, .0) 100%)',
                'input-error-border':
                    'linear-gradient(to bottom right, rgba(241, 136, 136, .82) 0%, rgba(235, 121, 121, .29) 45%, rgba(235, 121, 121, .29) 100%)',
            },
            fontFamily: {
                body: ['Poppins', 'sans-serif'],
            },
            fontSize: {
                '32px': '2rem',
            },
            lineHeight: {
                '32px': '2rem',
                '56px': '3.5rem',
            },
            spacing: {
                '18px': '1.125rem',
                '30px': '1.875rem',
                '34px': '2.125rem',
                '51px': '3.1875rem',
                '72px': '4.5rem',
                '124px': '7.75rem',
                '158px': '9.875rem',
            },
            borderRadius: {
                '3px': '0.1875rem',
                '5px': '0.3125rem',
                '21px': '1.3125rem',
            },
            opacity: {
                1: '0.01',
                3: '0.03',
                7: '0.07',
                12: '0.12',
                15: '0.15',
                29: '0.29',
                65: '0.65',
            },
            boxShadow: {
                button: 'inset 1px 1px 1px rgba(10, 17, 36, 0.48)',
                input: 'inset 1px 1px 1px rgba(232, 232, 245, 0.82)',
                'input-error': 'inset 1px 1px 1px rgba(241, 136, 136, 0.82)',
            },
            backdropBlur: {
                '33px': '33px',
            },
            zIndex: {
                1: '1',
            },
        },
    },
    plugins: [],
}
