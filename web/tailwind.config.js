/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            screens: {
                '3xl': '2560px',
            },
            fontFamily: {
                body: ['Poppins', 'sans-serif'],
            },
            height: {
                screen: ['100vh', '100dvh'],
            },
            maxWidth: {
                'side-right': '20.4375rem',
                'side-right-md': '18rem',
                '264px': '16.5rem',
            },
            colors: {
                'gray-050a15': '#050a15',
                'gray-0a1124': '#0a1124',
                'gray-606060': '#606060',
                'gray-505050': '#505050',
                extblue: '#61a3ff',

                // refactor
                'gray-7c8db5': '#7c8db5',
                'gray-fafafd': '#fafafd',
                'gray-f6f6f9': '#f6f6f9',
                'gray-53596d': '#53596d',
                'gray-e6edff': '#e6edff',
                'gray-d6e4ee': '#d6e4ee',
                'gray-e5e5f9': '#e5e5f9',
                'blue-2b89ff': '#2b89ff',
                'blue-348eff': '#348eff',
                'blue-1e7aec': '#1e7aec',
                'green-34c759': '#34c759',
                'green-deecdc': '#deecdc',
                'green-2fbf5340': '#2fbf5340',
                'red-dd3a3a': '#dd3a3a',
                'red-ff3b30': '#ff3b30',
                'red-ff624d40': '#ff624d40',
                'yellow-faedcc': '#faedcc',
                'yellow-eecf29': '#eecf29',
            },
            spacing: {
                '30px': '1.875rem',
                '34px': '2.125rem',
            },
            zIndex: {
                1: '1',
            },
        },
    },
    plugins: [],
}
