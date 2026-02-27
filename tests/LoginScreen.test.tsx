import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LoginScreen from '../components/LoginScreen';

// Mock Firebase auth service
vi.mock('../services/authService', () => ({
    signInWithGoogle: vi.fn(),
    signInWithEmailPassword: vi.fn(),
}));

// Mock Firestore user service
vi.mock('../services/userService', () => ({
    getOrCreateUserProfile: vi.fn(),
}));

import * as authService from '../services/authService';
import * as userService from '../services/userService';

describe('LoginScreen Component', () => {
    const mockOnLogin = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows splash screen first', () => {
        render(<LoginScreen onLogin={mockOnLogin} />);
        expect(screen.getByText('Tap to Begin')).toBeInTheDocument();
    });

    it('shows Google sign-in button after splash click', async () => {
        render(<LoginScreen onLogin={mockOnLogin} />);
        fireEvent.click(screen.getByText('Tap to Begin'));
        expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('shows @spjimr.org domain hint text', () => {
        render(<LoginScreen onLogin={mockOnLogin} />);
        fireEvent.click(screen.getByText('Tap to Begin'));
        expect(screen.getByText(/@spjimr\.org/)).toBeInTheDocument();
    });

    it('shows error message when domain is rejected', async () => {
        (authService.signInWithGoogle as any).mockRejectedValueOnce(
            new Error('Access restricted. Please use your @spjimr.org email address.')
        );

        render(<LoginScreen onLogin={mockOnLogin} />);
        fireEvent.click(screen.getByText('Tap to Begin'));
        fireEvent.click(screen.getByText('Sign in with Google'));

        await waitFor(() => {
            expect(screen.getByText(/Access restricted/)).toBeInTheDocument();
        });
    });

    it('calls onLogin with profile on successful Google sign-in', async () => {
        const mockFbUser = { uid: 'uid-123', email: 'test@spjimr.org', displayName: 'Test User' };
        const mockProfile = { id: 'uid-123', role: 'student', email: 'test@spjimr.org', name: 'Test User' };

        (authService.signInWithGoogle as any).mockResolvedValueOnce(mockFbUser);
        (userService.getOrCreateUserProfile as any).mockResolvedValueOnce(mockProfile);

        render(<LoginScreen onLogin={mockOnLogin} />);
        fireEvent.click(screen.getByText('Tap to Begin'));
        fireEvent.click(screen.getByText('Sign in with Google'));

        await waitFor(() => {
            expect(mockOnLogin).toHaveBeenCalledWith(mockProfile);
        });
    });
});
