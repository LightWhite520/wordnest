import { mount } from 'svelte';
import App from './routes/+page.svelte';
import './routes/layout.css';
mount(App, { target: document.getElementById('app')! });
