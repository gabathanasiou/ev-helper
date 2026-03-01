# EV Helper Homebrew Formula
# This file lives in a separate GitHub repo: gabathanasiou/homebrew-ev-helper
#
# Installation:
#   brew tap gabathanasiou/ev-helper
#   brew install ev-helper
#
# SHA256 values and version are updated automatically by GitHub Actions
# on each release (if the HOMEBREW_TAP_TOKEN secret is configured).

class EvHelper < Formula
  desc "Blazing fast CLI for Pokémon FireRed/LeafGreen & R/S/E EV training"
  homepage "https://github.com/gabathanasiou/ev-helper"
  version "1.0.4"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/gabathanasiou/ev-helper/releases/download/v#{version}/ev-helper-cli-macos-arm64.tar.gz"
      sha256 "8b242860612066e74570b62f9b3b0e9647e050eceb23ab39922aef6ed6b70c03"
    else
      url "https://github.com/gabathanasiou/ev-helper/releases/download/v#{version}/ev-helper-cli-macos-x64.tar.gz"
      sha256 "7445bde3f83df05d313aa3b6e63d21329cce33e5f0162be32f6005ea3090ee42"
    end
  end

  on_linux do
    url "https://github.com/gabathanasiou/ev-helper/releases/download/v#{version}/ev-helper-cli-linux-x64.tar.gz"
    sha256 "ff827a471fc1c50cb297da7a2effe056706e0643443ba1c9bd89163668bfc400"
  end

  def install
    if OS.mac?
      if Hardware::CPU.arm?
        bin.install "ev-helper-macos-arm64" => "ev-helper"
      else
        bin.install "ev-helper-macos-x64" => "ev-helper"
      end
    elsif OS.linux?
      bin.install "ev-helper-linux-x64" => "ev-helper"
    end
  end

  test do
    output = shell_output("#{bin}/ev-helper --help")
    assert_match "ev-helper", output
  end
end
