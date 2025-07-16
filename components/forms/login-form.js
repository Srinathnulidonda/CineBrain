// Login Form Component
class LoginForm {
    constructor() {
        this.isLogin = true;
    }

    render() {
        return `
            <div class="auth-form">
                <!-- Toggle -->
                <div class="flex mb-6 bg-secondary-bg rounded-lg p-1">
                    <button onclick="LoginFormInstance.setMode(true)" 
                            class="flex-1 py-2 rounded ${this.isLogin ? 'bg-netflix-red' : ''} transition">
                        Sign In
                    </button>
                    <button onclick="LoginFormInstance.setMode(false)" 
                            class="flex-1 py-2 rounded ${!this.isLogin ? 'bg-netflix-red' : ''} transition">
                        Sign Up
                    </button>
                </div>

                <!-- Form -->
                <form onsubmit="LoginFormInstance.handleSubmit(event)">
                    ${!this.isLogin ? `
                        <div class="mb-4">
                            <label class="block text-sm mb-2">Email</label>
                            <input 
                                type="email" 
                                name="email" 
                                required
                                class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red"
                            >
                        </div>
                    ` : ''}

                    <div class="mb-4">
                        <label class="block text-sm mb-2">${this.isLogin ? 'Username or Email' : 'Username'}</label>
                        <input 
                            type="text" 
                            name="username" 
                            required
                            class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red"
                        >
                    </div>

                    <div class="mb-6">
                        <label class="block text-sm mb-2">Password</label>
                        <input 
                            type="password" 
                            name="password" 
                            required
                            class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red"
                        >
                    </div>

                    <button type="submit" class="w-full bg-netflix-red hover:bg-hover-red py-3 rounded font-medium transition">
                        ${this.isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div class="mt-4 text-center text-sm text-text-secondary">
                    ${this.isLogin ? 
                        `Don't have an account? <button onclick="LoginFormInstance.setMode(false)" class="text-netflix-red hover:underline">Sign up</button>` :
                        `Already have an account? <button onclick="LoginFormInstance.setMode(true)" class="text-netflix-red hover:underline">Sign in</button>`
                    }
                </div>
            </div>
        `;
    }

    setMode(isLogin) {
        this.isLogin = isLogin;
        const modalContent = document.querySelector('.modal-body');
        if (modalContent) {
            modalContent.innerHTML = this.render();
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);

        try {
            Loading.show();
            
            if (this.isLogin) {
                await AuthService.login(data.username, data.password);
                new Toast('Welcome back!', 'success').show();
            } else {
                await AuthService.register(data.username, data.email, data.password);
                new Toast('Account created successfully!', 'success').show();
            }

            Modal.closeAll();
            window.location.reload();
        } catch (error) {
            new Toast(error.message || 'Authentication failed', 'error').show();
        } finally {
            Loading.hide();
        }
    }
}

// Create global instance
const LoginFormInstance = new LoginForm();