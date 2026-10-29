import SwiftUI

struct GrabView: View {
    @State private var model: GrabViewModel
    @FocusState private var isEditing: Bool

    init(service: GifService) {
        _model = State(initialValue: GrabViewModel(service: service))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                HStack {
                    GifSuiteEyebrow(text: "The GIF suite for X")
                    Spacer(minLength: 16)
                    GifSuiteMark().frame(width: 76, height: 76)
                }
                .padding(.top, 12)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Good GIFs.\nOn repeat.")
                        .font(.largeTitle.weight(.black))
                        .tracking(-1.2)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Grab a moment from X.\nMake it yours to share.")
                        .font(.body)
                        .foregroundStyle(GifSuiteColor.muted)
                }

                VStack(alignment: .leading, spacing: 18) {
                    GifSuiteEyebrow(text: "Start with a link")
                    TextField("Paste an X post link", text: $model.postURL)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .submitLabel(.go)
                        .focused($isEditing)
                        .onSubmit(submit)
                        .padding(16)
                        .background(GifSuiteColor.canvas, in: RoundedRectangle(cornerRadius: 14))
                        .overlay {
                            RoundedRectangle(cornerRadius: 14)
                                .strokeBorder(isEditing ? GifSuiteColor.accent : GifSuiteColor.line)
                        }
                        .accessibilityLabel("X post link")

                    Button(action: submit) {
                        HStack(spacing: 10) {
                            if model.isSubmitting {
                                ProgressView().tint(GifSuiteColor.canvas)
                            } else {
                                Image(systemName: "arrow.down.circle.fill")
                            }
                            Text(model.isSubmitting ? "Grabbing…" : "Grab GIF")
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                    }
                    .buttonStyle(GifSuitePrimaryButtonStyle())
                    .disabled(model.isSubmitting || model.postURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    if let message = model.message {
                        Label(message, systemImage: model.isError ? "exclamationmark.circle" : "checkmark.circle")
                            .font(.subheadline)
                            .foregroundStyle(model.isError ? GifSuiteColor.danger : GifSuiteColor.success)
                            .accessibilityAddTraits(.updatesFrequently)
                    }
                }
                .padding(20)
                .gifSuiteCard()

                Label("Every grab joins the public timeline.", systemImage: "globe")
                    .font(.footnote)
                    .foregroundStyle(GifSuiteColor.muted)

                GifSuiteHalftone()
                HStack(alignment: .top, spacing: 14) {
                    Image(systemName: "repeat")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(GifSuiteColor.accent)
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Find it. Loop it. Love it.").font(.headline)
                        Text("Your next favourite is waiting in the timeline.")
                            .font(.subheadline)
                            .foregroundStyle(GifSuiteColor.muted)
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
            .frame(maxWidth: 600)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(GifSuiteColor.canvas.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: 8) {
                    GifSuiteMark().frame(width: 25, height: 25)
                    Text("GifSuite").font(.headline.weight(.bold))
                }
                .accessibilityElement(children: .combine)
            }
        }
    }

    private func submit() {
        guard !model.isSubmitting,
              !model.postURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        isEditing = false
        Task { await model.grab() }
    }
}
