// Optimized Register Form Component
class RegisterForm {
    render() {
        return `
            <form onsubmit="RegisterFormInstance.handleSubmit(event)" class="register-form">
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Username *</label>
                    <input type="text" name="username" required
                           pattern="[a-zA-Z0-9_]{3,20}"
                           title="3-20 characters, letters, numbers and underscores only"
                           class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                </div>

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Email *</label>
                    <input type="email" name="email" required
                           class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                </div>

                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">Password *</label>
                    <input type="password" name="password" required
                           minlength="6"
                           class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                    <p class="text-xs text-text-muted mt-1">Minimum 6 characters</p>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2">Confirm Password *</label>
                    <input type="password" name="confirmPassword" required
                           class="w-full bg-secondary-bg border border-border-color rounded px-4 py-2 focus:outline-none focus:border-netflix-red">
                </div>

                <div class="mb-6">
                    <label class="flex items-center">
                        <input type="checkbox" name="terms" required
                               class="mr-2 accent-netflix-red">
                        <span class="text-sm">I agree to the Terms of Service and Privacy Policy</span>
                    </label>
                </div>

                <button type="submit" class="w-full bg-netflix-red hover:bg-hover-red py-3 rounded font-medium transition">
                    Create Account
                </button>
            </form>
        `;
    }

    async handleSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        if (formData.get('password') !== formData.get('confirmPassword')) {
            new Toast('Passwords do not match', 'error').show();
            return;
        }

        try {
            Loading.show();
            await AuthService.register(
                formData.get('username'),
                formData.get('email'),
                formData.get('password')
            );
            
            new Toast('Account created successfully!', 'success').show();
            Modal.closeAll();
            window.location.reload();
        } catch (error) {
            new Toast(error.message || 'Registration failed', 'error').show();
        } finally {
            Loading.hide();
        }
    }
}

const RegisterFormInstance = new RegisterForm();